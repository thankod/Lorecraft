# 仲裁层 Pipeline

## 设计原则

- 五层检查顺序固定，前层失败则不执行后层（提前短路）
- Layer 2（物理可行性）是纯代码检查，不调用 LLM
- Layer 1/3/4/5 需要 LLM 语义判断，各自有独立的 ContextAssembler
- Layer 1/2/3 的数据查询可并发，合并结果后进行判断

---

## 步骤序列

```
输入：AtomicAction（单个原子动作）+ PipelineContext

// 并发查询阶段（代码）
Parallel:
  Query A: 角色主观记忆近期缓冲 + RAG 召回   → 用于 Layer 1/3
  Query B: 世界客观状态（地点/时间/可进入性）  → 用于 Layer 2

Wait for Parallel Queries

Layer 1: 信息完整性检查（LLM）
  输入：原子动作 + Query A 结果（主观记忆）
  LLM 判断：角色主观上是否拥有执行此动作所需的信息？
  ├─ passed: false → 生成叙事拒绝文本 → 短路返回
  └─ passed: true → 继续

Layer 2: 空间/状态可行性检查（纯代码）
  输入：原子动作 + Query B 结果（客观状态）
  代码检查：目标地点是否存在、是否可达、目标对象是否在场
  ├─ failed → 生成叙事拒绝文本（LLM 生成文本，代码决定策略）→ 短路返回
  └─ passed → 继续

Layer 3: 社会/关系可行性检查（LLM）
  输入：原子动作 + Query A 结果（关系图谱部分）
  LLM 判断：当前关系状态是否允许此交互？场合是否合适？
  ├─ passed: false → 生成叙事拒绝文本 → 短路返回
  └─ passed: true → 继续

// Layer 4 需要额外查询
Query C: Lore 相关条目 + 近期事件历史（LoreStore + EventStore）

Layer 4: 叙事可行性检查（LLM）
  输入：原子动作 + Query C 结果
  LLM 判断：叙事前置条件是否满足？动作是否产生逻辑悖论？
  ├─ passed: false → 生成叙事拒绝文本 → 短路返回
  └─ passed: true → 继续

Layer 5: 叙事轨道检查（LLM）
  输入：原子动作 + 叙事结构摘要 + 近期事件方向
  LLM 判断：此动作是否会导致叙事严重偏轨？
  ├─ drift_detected: true → 不短路，仍然通过仲裁
  │   结果附加 drift_flag=true，通知叙事轨道 Agent
  │   叙事轨道 Agent 在异步周期内自主决定干预方式
  │   （通过注入队列间接影响，不在主链中阻断玩家行为）
  └─ drift_detected: false → 继续

输出：ArbitrationResult { passed: true, action, force_flag, force_level, drift_flag }
```

---

## 拒绝策略路由（代码逻辑）

```
失败层 → 默认拒绝策略映射（代码路由，不由 LLM 决定策略类型）：

Layer 1（信息不足）   → NARRATIVE_ABSORB（叙事内消化，提示角色不知道）
Layer 2（物理不可行） → PARTIAL_EXEC（部分执行+自然中断）或 NARRATIVE_ABSORB
Layer 3（社会不可行） → NARRATIVE_ABSORB（通过 NPC 反应或环境体现阻力）
Layer 4（叙事前置缺失）→ REINTERPRET（重新解读意图，说明缺少条件）
Layer 5（轨道偏离）   → 不直接拒绝，不短路 Pipeline

CONSEQUENCE（代价式执行）：仅在 force_flag=true 时由事件 Agent 使用，
  不是仲裁层的拒绝策略，而是事件生成时的后果加权模式。
  仲裁层输出中不使用此值。
```

确定拒绝策略类型后，调用 `RejectionNarrativeGenerator` 生成具体叙事文本。

---

## 并发查询实现

Layer 1/2/3 的查询（Query A 和 Query B）可以并发执行：

```
results = await Promise.all([
  memoryStore.querySubjective(character_id, action_context),
  worldState.queryObjective(action.target_location)
])
```

Query C（Layer 4 使用）在 Layer 3 通过后才发起，不提前并发（避免浪费）。
