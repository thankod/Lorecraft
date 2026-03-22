# 05 数据模型总览

## 核心实体一览

| 实体 | 所属命名空间 | 读写权限 | 详细文档 |
|------|------------|---------|---------|
| `Event` | 全局（客观）| 只有 EventAgent 写入，其余只读 | [event_schema.md](../04_event_bus/event_schema.md) |
| `WorldState` | 全局（客观）| WorldAgent 写入，ArbitrationService 只读 | [world_state_schema.md](./world_state_schema.md) |
| `CharacterState` | 各角色命名空间 | 对应 NPC Agent 写入 | [character_state_schema.md](./character_state_schema.md) |
| `SubjectiveMemory` | 各角色命名空间 | 对应 NPC Agent 写入 | [character_state_schema.md](./character_state_schema.md) |
| `LoreEntry` | 全局（客观）| LoreCanonicalizer 写入，只读 | [lore_schema.md](./lore_schema.md) |
| `TraitWeight` | 玩家命名空间 | SignalProcessor 写入 | [trait_weight_schema.md](./trait_weight_schema.md) |
| `NPCInjection` | per-NPC 队列 | NarrativeRailService 写入，NPC Agent 消费 | [injection_queues.md](../04_event_bus/injection_queues.md) |
| `GenesisDocument` | 会话级别 | InitAgent 写入，游戏启动后只读 | [world_state_schema.md](./world_state_schema.md) |

---

## 主观与客观数据的命名空间隔离

```
全局命名空间（客观）：
  events:*           → EventStore
  world:*            → StateStore（WorldAgent 写入分区）
  lore:*             → LoreStore

角色命名空间（主观，per npc_id）：
  character:{npc_id}:state         → StateStore（NPC 写入分区）
  character:{npc_id}:memory:*      → SubjectiveMemoryStore
  character:{npc_id}:relations:*   → RelationshipStore

玩家专属命名空间：
  player:traits:*                  → TraitWeightStore
  player:persisting_state:*        → StateStore（玩家分区）

会话级别：
  session:{session_id}:genesis     → SessionStore
  session:{session_id}:save:*      → SessionStore
```

**禁止的访问模式**：
- NPC Agent 不可直接读写其他 NPC 的命名空间
- Domain 层不可直接读取 `events:tier4:*`（叙事文本不应被代码解析）

---

## 数据归属与读写权限矩阵

| 存储 | 写入方 | 读取方 |
|------|--------|--------|
| EventStore | EventAgent.StateUpdate（唯一写入方）| 所有模块（只读） |
| WorldState | WorldAgent.StateUpdate | ArbitrationService、ContextAssembler |
| LoreStore | LoreCanonicalizer.StateUpdate | ContextAssembler、ArbitrationService |
| SubjectiveMemoryStore | NPC Agent.StateUpdate | 对应 NPC 的 ContextAssembler |
| RelationshipStore | NPC Agent.StateUpdate | ArbitrationService（Layer 3）、ContextAssembler |
| TraitWeightStore | SignalProcessor | ReflectionPipeline |
| SessionStore | InitAgent（创世文档）| 游戏加载时读取 |
