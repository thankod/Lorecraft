# 待注入队列设计

叙事轨道 Agent 通过两个队列间接影响游戏世界，不直接修改任何 Agent 的运行状态。

---

## 反思系统注入队列

**用途**：叙事轨道 Agent 触发第一级干预时，向内心声音系统注入提示内容。

```typescript
type ReflectionInjection = {
  id: string
  voice_id: string          // 具体哪个认知声音发言（如 "planning", "intuition"）
  content: string           // 注入的提示内容（信息层，非指令）
  priority: "LOW" | "HIGH"
  expiry_turns: number      // N 轮后未消费则丢弃
  created_at_turn: number
}
```

**消费时机**：ReflectionPipeline Step 2 读取，在下一个叙事自然间隙消费（对话结束、场景转换时）。
**消费后**：从队列移除。过期未消费直接丢弃，不报错。

---

## NPC 待注入队列（per NPC）

**用途**：叙事轨道 Agent 触发第二级干预时，向当前对话的 NPC 注入话题提示。

```typescript
type NPCInjection = {
  id: string
  npc_id: string
  context: string           // 信息层注入："你隐约听说了…，如果合适可以提及"
  condition: string         // NPC 自行判断的插入条件（"合适时机"、"对方问起相关话题时"）
  expiry_turns: number
  created_at_turn: number
}
```

**消费时机**：NPC Agent 的 ContextAssembler 在组装上下文时读取，作为最高优先级数据注入。
**消费后**：NPC 发言后从队列移除（无论 NPC 是否实际使用了注入内容）。

---

## 队列管理

```typescript
interface IInjectionQueueManager {
  // 叙事轨道 Agent 调用（写入）
  enqueueReflection(injection: ReflectionInjection): void
  enqueueNPC(injection: NPCInjection): void

  // ReflectionPipeline 调用（读取）
  dequeueReflection(): ReflectionInjection[]

  // NPC ContextAssembler 调用（读取）
  dequeueNPC(npc_id: string): NPCInjection[]

  // AgentScheduler 定期调用（清理过期条目）
  pruneExpired(current_turn: number): void
}
```

**优先级与冲突**：
- 反思队列中存在多条注入时，按 `priority` 排序，同优先级按创建时间排序
- NPC 队列中同一 NPC 存在多条注入时，合并注入到同一 context 字段（追加）
- 若合并后超过 token 预算，按创建时间保留最新的 N 条

---

## 叙事轨道 Agent 的写入接口

叙事轨道 Agent 只能通过 `IInjectionQueueManager` 与世界交互（除三级干预外）。
三级干预通过向 EventBus 提交 NPC 自主行动请求实现，走正常 Pipeline 流程。

这个设计确保：叙事轨道 Agent 的所有影响都是**间接的、可追踪的**，不直接修改任何游戏状态。
