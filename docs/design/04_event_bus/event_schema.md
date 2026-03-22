# 事件数据结构

## 完整 Schema

```typescript
type EventWeight = "PRIVATE" | "MINOR" | "SIGNIFICANT" | "MAJOR"

type EventTag =
  | "DIALOGUE" | "CONFLICT" | "DISCOVERY" | "RELATIONSHIP_CHANGE"
  | "LOCATION_CHANGE" | "ITEM_TRANSFER" | "NPC_ACTION" | "WORLD_CHANGE"
  | "INFERRED"   // 惰性求值补算产生的事件

type Event = {
  // Tier 1: 元数据（始终加载，常驻内存索引）
  id: string                    // UUID，全局唯一，幂等键
  title: string                 // 简短标识符，如 "对峙警察局长"
  timestamp: GameTimestamp      // 游戏内时间戳
  location_id: string           // 发生地点 ID
  participant_ids: string[]     // 涉及角色 ID 列表
  tags: EventTag[]              // 类型标签，用于广播过滤和信号 B 判断
  weight: EventWeight           // 事件权重，用于广播范围决策
  force_level: 0 | 1 | 2       // 来自反思系统坚持标记（0=正常）
  created_at: number            // 系统时间戳（用于排序）

  // Tier 2: 摘要（按需加载）
  summary: string               // 1-3 句话，用于 RAG 索引和快速推理
  choice_signals: {             // 信号 B 标注，用于特质权重更新
    [trait_id: string]: number  // -1.0 到 1.0，正值增加，负值抵消
  }

  // Tier 3: 上下文介绍（按需加载）
  context: string               // 理解此事件所需的背景，由 AI 在生成时填写
  related_event_ids: string[]   // 相关事件 ID，用于建立叙事链
  state_snapshot: {             // 事件发生时的关键状态快照，用于孤立读取
    location_state: string
    participant_states: { [npc_id: string]: string }
  }

  // Tier 4: 事件原文（按需加载）
  narrative_text: string        // 游戏叙事文本原文，=玩家看到的内容，不可修改
}
```

---

## 分层存储实现

各 Tier 分开存储，以实现懒加载：

```
存储键规则：
  Tier 1: events:tier1:{event_id}
  Tier 2: events:tier2:{event_id}
  Tier 3: events:tier3:{event_id}
  Tier 4: events:tier4:{event_id}

读取接口：
  EventStore.getTier1(event_id) → Tier1Data
  EventStore.getTier2(event_id) → Tier2Data
  EventStore.getTier3(event_id) → Tier3Data
  EventStore.getTier4(event_id) → Tier4Data
  EventStore.getTiers(event_id, tiers: number[]) → Partial<Event>
```

---

## 不可变性约束

事件写入后只读：
- `EventStore` 只提供 `append()` 和 `get()` 接口，不提供 `update()` 或 `delete()`
- 任何试图修改已存在 event_id 的写入操作视为幂等（忽略，不报错）
- NPC 的主观记忆版本存储在独立的 `SubjectiveMemoryStore` 中，与 Event 不共享数据

---

## GameTimestamp

```typescript
type GameTimestamp = {
  day: number
  hour: number
  turn: number    // 该小时内的第几轮
}
```

`turn` 是最细粒度的时间单位，用于事件排序和惰性求值的时间计算。
