# 世界状态与创世文档数据模型

## LocationState

```typescript
type LocationState = {
  id: string
  name: string
  region_id: string
  current_status: string              // 当前状态描述
  accessibility: "OPEN" | "RESTRICTED" | "LOCKED" | "DESTROYED"
  current_occupant_ids: string[]      // 当前在此地点的 NPC ID
  is_frozen: boolean                  // 惰性求值冻结标记
  last_observed_turn: number          // 上次被玩家观测的 turn
  causal_chain: LocationCausalEntry[] // 状态变更历史（只增不减）
}

type LocationCausalEntry = {
  before_status: string
  change_reason: string      // 变更原因（叙事描述）
  after_status: string
  caused_by_event_id: string
  timestamp: GameTimestamp
}
```

---

## FactionState

```typescript
type FactionState = {
  id: string
  name: string
  current_strength: "WEAK" | "MODERATE" | "STRONG" | "DOMINANT"
  current_status_description: string
  resources_description: string
  causal_chain: FactionCausalEntry[]
}

type FactionCausalEntry = {
  change_description: string
  caused_by_event_id: string
  timestamp: GameTimestamp
}
```

---

## FactionRelationship

```typescript
type FactionRelationship = {
  faction_a_id: string
  faction_b_id: string
  relation_type: "ALLIED" | "NEUTRAL" | "HOSTILE" | "UNKNOWN"
  semantic_description: string     // 语义描述，用于 LLM 上下文
  causal_chain: RelationCausalEntry[]
}
```

---

## LocationGraph（地点连通性模型）

世界地图是一个**无向图**，节点是地点，边是连接。
不使用 2D/3D 坐标——对话式 CRPG 不需要精确空间，只需要逻辑上的"可达"关系。

```typescript
type LocationEdge = {
  from_location_id: string
  to_location_id: string
  traversal_condition: "OPEN" | "REQUIRES_KEY" | "REQUIRES_EVENT" | "BLOCKED"
  condition_detail: string | null     // 如 "需要 key_police_station" 或 event_id
  travel_time_turns: number           // 移动消耗的 turn 数（0=同一区域内）
}

// 可达性检查（仲裁 Layer 2 使用，纯代码）
function isReachable(from: string, to: string): ReachabilityResult {
  const path = findShortestPath(from, to, locationGraph)
  if (!path) return { reachable: false, reason: "无连接路径" }

  for (const edge of path) {
    if (edge.traversal_condition === "BLOCKED")
      return { reachable: false, reason: `路径中 ${edge.from_location_id}→${edge.to_location_id} 被阻断` }
    if (edge.traversal_condition === "REQUIRES_KEY" && !playerHasKey(edge.condition_detail))
      return { reachable: false, reason: `需要 ${edge.condition_detail}` }
    if (edge.traversal_condition === "REQUIRES_EVENT" && !eventHasOccurred(edge.condition_detail))
      return { reachable: false, reason: `前置事件未发生` }
  }

  return { reachable: true, total_travel_turns: sumTravelTime(path) }
}
```

`LocationEdge` 在初始化时由创世文档生成，运行时可由事件 Agent 的 `state_changes` 修改（如"爆炸摧毁了通道"→ 将某条边改为 BLOCKED）。

同区域（`region_id` 相同）的地点之间 `travel_time_turns = 0`（瞬时可达）。
跨区域移动消耗 turn（时间流逝），触发沿途冻结区域的惰性求值检查。

---

## NPCRoughLocation

粗粒度 NPC 位置追踪（不追踪精确坐标，只追踪地点）：

```typescript
type NPCRoughLocation = {
  npc_id: string
  location_id: string
  last_updated_turn: number
}
```

---

## GameTime

```typescript
type GameTime = {
  current: GameTimestamp
  total_turns: number
}
```

---

## GenesisDocument（创世文档）

初始化 Agent 的完整输出，持久化后在整个游戏周期内只读：

```typescript
type GenesisDocument = {
  id: string                           // 唯一标识，供多存档引用
  created_at: number

  world_setting: {
    background: string                 // 世界背景描述
    tone: string                       // 基调
    core_conflict: string              // 核心矛盾
    hidden_secrets: string[]           // 隐藏秘密列表
    factions: FactionDefinition[]      // 势力定义
  }

  narrative_structure: {
    final_goal_description: string
    inciting_event: IncitingEvent      // 起始事件，将在游戏开始时注入
    phases: NarrativePhase[]           // 叙事阶段列表
  }

  characters: {
    player_character: PlayerCharacterDefinition
    tier_a_npcs: TierANPCDefinition[]  // 3-7 个主要 NPC
    tier_b_npcs: TierBNPCDefinition[]  // 若干功能性 NPC
  }

  initial_locations: LocationDefinition[]
}

type NarrativePhase = {
  phase_id: string
  description: string                  // 本阶段的叙事重心
  direction_summary: string            // 叙事轨道 Agent 的主线方向描述
}

type TierANPCDefinition = {
  id: string
  name: string
  background: string
  surface_motivation: string
  deep_motivation: string             // 可能与表面动机不同
  secrets: string[]
  initial_relationships: { [npc_id: string]: string }  // 语义描述
}
```
