# 持久化策略

## 事件不可变存储

事件采用追加写日志（append-only log）模式：

```
写入：EventStore.append(event)
  → 写入 Tier 1+2+3+4 到对应存储键
  → 写入全局事件索引（按 GameTimestamp 排序）
  → 写入 participant 索引（每个 participant_id → event_id 列表）

读取：按 event_id 精确查询，或按索引范围扫描
修改：禁止（接口不提供 update 方法）
删除：禁止（接口不提供 delete 方法）
```

---

## 存档（Save）设计

存档 = 创世文档引用 + 当前状态快照：

```typescript
type SaveFile = {
  save_id: string
  genesis_document_id: string     // 引用，不复制创世文档
  saved_at_turn: number
  world_state_snapshot: WorldState
  all_character_states: { [npc_id: string]: CharacterDynamicState }
  trait_weights: TraitWeight[]
  conversation_histories: { [npc_id: string]: ConversationHistory }
  injection_queues_snapshot: {
    reflection: ReflectionInjection[]
    npc_queues: { [npc_id: string]: NPCInjection[] }
  }
}
```

**多存档共享同一创世文档**：存档只存引用，不复制世界定义。
同一创世文档 ID 的多个存档代表同一世界的不同游玩进度。

---

## 事件重放与状态恢复

游戏启动加载存档时：

```
1. 加载 GenesisDocument（世界定义，常驻内存）
2. 加载 SaveFile 中的状态快照
3. 恢复 VectorStore 索引（如需重建）
4. 不重放事件（状态快照已包含完整当前状态）
```

若状态快照损坏，降级方案（非正常流程）：
```
加载 GenesisDocument
→ 按 GameTimestamp 顺序扫描 EventStore
→ 依次应用 state_changes 重建状态
```

---

## 数据一致性保证

关键写入顺序约束（见 state_updater.md）：
```
EventStore.append()  必须在 StateStore.apply() 之前
StateStore.apply()   必须在 EventBus.publish() 之前
```

若进程在写入中途崩溃：
- 事件已写入但状态未更新 → 启动时检测到不一致 → 补充应用 state_changes
- 事件未写入 → 本次操作视为未发生，玩家重新输入
