# 角色状态与记忆数据模型

## CharacterDynamicState

```typescript
type CharacterDynamicState = {
  npc_id: string
  tier: "A" | "B" | "C"
  current_emotion: string                // 语义描述，如 "焦虑而警惕"
  current_location_id: string
  interaction_count: number              // 与玩家的交互次数（用于层级升级判断）
  is_active: boolean                     // 是否处于活跃对话中
  goal_queue: GoalQueueEntry[]           // 仅 Tier A 使用
}

type GoalQueueEntry = {
  id: string
  description: string
  priority: number                       // 1-10，越高越优先
  created_from_event_id: string | null
  status: "PENDING" | "IN_PROGRESS" | "COMPLETED" | "ABANDONED"
}
```

---

## RelationshipEntry

关系图谱使用语义描述而非纯数值，保留情感质感：

```typescript
type RelationshipEntry = {
  from_npc_id: string
  to_npc_id: string
  semantic_description: string   // 如 "警惕但好奇" / "深度不信任" / "暗中依赖"
  strength: number               // 0.0-1.0，用于广播路由的关系距离计算（纯数值，不暴露给 LLM）
  last_updated_event_id: string
}
```

`semantic_description` 是喂给 LLM 的描述；`strength` 是代码用于路由决策的数值。
两个字段分离，各司其职。

---

## MemoryBuffer（近期事件缓冲）

```typescript
type MemoryBuffer = {
  npc_id: string
  entries: MemoryBufferEntry[]
  max_size: number              // Tier A: 20条, Tier B: 5条
}

type MemoryBufferEntry = {
  event_id: string
  subjective_summary: string    // 该 NPC 对此事件的主观摘要
  distortion_type: "NONE" | "INFO_GAP" | "INTENT_MISREAD" | "EMOTIONAL_DISTORTION"
  recorded_at_turn: number
}
```

当 `entries` 超过 `max_size` 时，最旧的条目移出缓冲区：
- Tier A：移出的条目建立向量索引，写入 VectorStore（长期记忆）
- Tier B：直接丢弃（仅保留近期 N 条交互记忆）
- Tier C：不存在 MemoryBuffer

---

## 对话历史

对话历史单独存储，不与事件记忆混合：

```typescript
type ConversationHistory = {
  session_id: string
  npc_id: string
  turns: ConversationTurn[]
  max_turns: number           // 保留的最大轮数（超出时从中间压缩）
}

type ConversationTurn = {
  role: "PLAYER" | "NPC"
  content: string
  turn_number: number
}
```

---

## Tier C 人格模板

```typescript
type TierCTemplate = {
  template_id: string
  type: string                  // 如 "路人", "小贩", "守卫"
  personality_sketch: string    // 简短人格描述，每次实例化时注入 System Prompt
  default_response_style: string
}
```

Tier C NPC 不持有任何状态，每次交互从模板重新实例化，对话结束后状态丢弃。

---

## NPC 层级升降级规则（NPCTierManager）

纯代码逻辑，不调用 LLM：

```typescript
// 升级：C → B
const TIER_C_TO_B_THRESHOLD = 3  // 与同一 Tier C NPC 交互 3 次

function checkUpgrade(npc: CharacterDynamicState): void {
  if (npc.tier === "C" && npc.interaction_count >= TIER_C_TO_B_THRESHOLD) {
    npc.tier = "B"
    // 创建 MemoryBuffer（max_size=5）
    // 将最近 3 次交互的 ConversationHistory 摘要写入初始记忆
    initializeMemoryBuffer(npc.npc_id, 5)
  }
}

// B → A 不自动升级，仅由叙事事件或游戏作者配置触发
// Tier A 是剧情关键角色，不应由交互次数决定

// 降级：B → B-lite（轻量模式）
const TIER_B_INACTIVE_THRESHOLD = 50  // 50 轮无交互

function checkDowngrade(npc: CharacterDynamicState, current_turn: number): void {
  if (npc.tier === "B") {
    const last_interaction_turn = getLastInteractionTurn(npc.npc_id)
    if (current_turn - last_interaction_turn > TIER_B_INACTIVE_THRESHOLD) {
      compressMemoryToSummary(npc.npc_id)  // 压缩记忆为单条摘要
      // npc.tier 仍为 "B"，但内部标记为 lite 模式
    }
  }
}

// Tier A 不降级
```

阈值可由游戏作者在配置文件中覆盖。
