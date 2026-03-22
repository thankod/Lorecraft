# StateUpdate 设计规范

## 职责与位置

StateUpdate 属于 **Domain 层**，不属于 AI 层。
它接收 ResponseParser 输出的 Domain 对象，执行业务状态变更。

**StateUpdate 是系统中所有状态写入的唯一入口。**
LLM 永远不直接写状态；Infrastructure 层永远不直接被 Agent 逻辑调用。

---

## 幂等性要求

所有 StateUpdate 操作必须幂等：使用相同输入多次调用，结果与调用一次相同。

实现方式：
- 事件写入以 `event_id` 作为幂等键，重复写入同一 `event_id` 视为 no-op
- 状态更新基于事件 ID 的写入版本检查，已应用的事件不重复应用
- Lore 写入以 `(content_hash, npc_id)` 作为幂等键

---

## 写入原子性

事件写入与状态更新必须保证顺序一致性：

```
1. 写入 EventStore（先写事件）
2. 更新 StateStore（再更新状态）
3. 写入成功后，触发 EventBus 广播
```

Step 2 失败时：事件已写入，下次启动时通过事件重放恢复状态。
Step 3 失败时：事件和状态已一致，广播是 best-effort（EventBus 消费失败不影响主链）。

---

## 各 Agent 的写入目标

| Agent | 写入的存储 | 写入的数据 |
|-------|-----------|----------|
| 初始化 Agent | LoreStore (Level 1), StateStore, SessionStore | 创世文档各部分 |
| 输入层 | InjectionQueue（TraitWeightQueue）| 信号 A 更新请求 |
| 反思系统 | TraitWeightStore | 权重更新；坚持状态 |
| 仲裁层 | 无（只读查询，结果返回给 Pipeline）| — |
| 事件 Agent | EventStore, StateStore | 事件 Tier 1-4；状态变更 |
| NPC Agent | StateStore（NPC 情感状态）, MemoryBuffer | NPC 状态；近期记忆 |
| 世界 Agent | EventStore, StateStore | 补算事件；地点状态 |
| 叙事轨道 Agent | InjectionQueueManager | 反思队列 / NPC 待注入队列 |
| Lore 固化 | LoreStore, NPCProfileStore | 新 Lore 条目；NPC 档案更新 |

---

## 触发 EventBus 广播的时机

只有事件 Agent 的 StateUpdate 会触发 EventBus 广播：

```
EventAgent.StateUpdate:
  1. event = EventStore.append(generated_event)   // 写入成功
  2. StateStore.apply(event.state_changes)         // 状态更新
  3. EventBus.publish(event.tier1)                 // 广播 Tier 1
```

其他 Agent 的 StateUpdate 不直接触发广播，通过队列间接通知。
