# 惰性求值实现设计

## 触发条件检测

每次玩家进入地点或与某 NPC 开始交互时，在 MainPipeline 的前置检查中触发：

```typescript
async function checkAndEvaluate(target_id: string, target_type: "LOCATION" | "NPC") {
  const state = await StateStore.get(`world:${target_type}:${target_id}`)

  if (!state.is_frozen) return  // 非冻结状态，无需补算

  const elapsed_turns = currentTurn - state.last_observed_turn
  if (elapsed_turns === 0) return  // 本轮已观测过，无需补算

  await performLazyEvaluation(target_id, target_type, state, elapsed_turns)
}
```

---

## 补算流程

```
Step 1: 查询冻结状态快照
  → 上次观测时的 LocationState / CharacterDynamicState

Step 2: 扫描期间的全局重大事件（代码）
  → EventStore.scanByTimeRange(last_observed, current)
  → 过滤 weight >= "SIGNIFICANT" 的事件
  → 最多取 10 条（避免 context 过长）

Step 3: 查询相关 NPC 的目标队列（仅 Tier A）
  → CharacterState.goal_queue 中 status = "PENDING" 的目标

Step 4: 补算 LLM 调用（AI 层）
  → LazyEvalInference（见 input_output_contracts.md）
  → 根据 NPC Tier 决定调用深度：
      Tier A: 完整补算（注入目标队列 + 全局事件）
      Tier B: 简化补算（只注入全局事件，无目标队列）
      Tier C: 跳过（直接重置为默认状态）

Step 5: 将补算结果写入为正式事件
  → 对 inferred_events 中每条推断事件，走完整 EventPipeline
  → 这些事件的 tags 包含 "INFERRED" 标记，区分于玩家触发的事件
  → 事件 weight 由补算 LLM 自行评定

Step 6: 更新冻结状态
  → StateStore.set: is_frozen = false, last_observed_turn = current
```

---

## 并发锁

同一目标的补算不能并行执行（防止同一区域被重复补算）：

```typescript
const evaluationLocks = new Map<string, Promise<void>>()

async function performLazyEvaluation(target_id: string, ...) {
  if (evaluationLocks.has(target_id)) {
    await evaluationLocks.get(target_id)  // 等待正在进行的补算完成
    return
  }
  const evaluation = doEvaluation(target_id, ...)
  evaluationLocks.set(target_id, evaluation)
  await evaluation
  evaluationLocks.delete(target_id)
}
```

---

## 重新冻结

地点/NPC 在玩家离开后重新进入冻结状态：

```typescript
// 当玩家离开地点或结束对话时触发
function freezeTarget(target_id: string, current_turn: number) {
  StateStore.set(`world:location:${target_id}`, {
    ...currentState,
    is_frozen: true,
    last_observed_turn: current_turn
  })
}
```

玩家的"当前所在地点"和"正在对话的 NPC"始终处于非冻结状态。
