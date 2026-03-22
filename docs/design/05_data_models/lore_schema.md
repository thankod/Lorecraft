# Lore 数据模型

## LoreEntry

```typescript
type LoreAuthorityLevel = "AUTHOR_PRESET" | "AI_CANONICALIZED"

type LoreFactType = "NPC_PERSONAL" | "WORLD" | "RELATIONSHIP" | "ORGANIZATION"

type LoreEntry = {
  id: string
  content: string                      // 事实内容，自然语言描述
  fact_type: LoreFactType
  authority_level: LoreAuthorityLevel
  subject_ids: string[]                // 此事实涉及的 NPC/地点/势力 ID
  source_event_id: string | null       // AI_CANONICALIZED 时：来源事件 ID；AUTHOR_PRESET 时：null
  created_at_turn: number
  causal_chain: LoreCausalEntry[]      // 此 Lore 的变更历史
  related_lore_ids: string[]           // 相关 Lore 的 ID，用于一致性检查
  content_hash: string                 // 用于幂等写入
}
```

---

## LoreCausalEntry（因果链条目）

Lore 不是简单的覆盖更新，而是追加因果链。查询时返回当前状态和完整历史：

```typescript
type LoreCausalEntry = {
  before_content: string       // 变更前的状态描述
  change_reason: string        // 为何发生变更（叙事描述）
  after_content: string        // 变更后的状态（= 新 LoreEntry.content）
  caused_by_event_id: string
  timestamp: GameTimestamp
}
```

**示例**：
```
LoreEntry: location "A 市场"
  content: "废墟，三天前被炸毁"
  causal_chain: [
    {
      before_content: "繁忙的露天市场，城市的商业中心",
      change_reason: "派系冲突导致的炸弹袭击",
      after_content: "废墟，三天前被炸毁",
      caused_by_event_id: "evt_xxx",
      timestamp: { day: 3, hour: 14, turn: 2 }
    }
  ]
```

查询 "A 市场" 时，系统返回当前状态（废墟）和因果链（为何被炸），帮助玩家理解上下文。

---

## 权威层级与查询优先级

```typescript
// 查询时，AUTHOR_PRESET 条目优先于 AI_CANONICALIZED 条目返回
function queryLore(subject_id: string, query_context: string): LoreEntry[] {
  const entries = LoreStore.findBySubject(subject_id)
  return entries.sort((a, b) => {
    if (a.authority_level === "AUTHOR_PRESET") return -1
    if (b.authority_level === "AUTHOR_PRESET") return 1
    return b.created_at_turn - a.created_at_turn  // 新的优先
  })
}
```

---

## NPC 档案作为 Lore 本地缓存

NPC 档案（`NPCProfile`）是 Lore 层中该 NPC 相关条目的本地缓存，避免每次 NPC 对话都查询 LoreStore。

同步规则：
- LoreCanonicalizer 写入新 Lore 条目后，同步更新对应 NPC 的 `NPCProfile`
- `NPCProfile` 的字段按 Lore fact_type 分类存储：
  ```typescript
  type NPCProfile = {
    npc_id: string
    personal_facts: string[]      // NPC_PERSONAL 类型的 Lore 内容摘要
    known_relationships: string[] // RELATIONSHIP 类型的 Lore 内容摘要
    last_synced_turn: number
  }
  ```
- 若 `NPCProfile` 落后（`last_synced_turn` 过旧），ContextAssembler 降级为直接查询 LoreStore
