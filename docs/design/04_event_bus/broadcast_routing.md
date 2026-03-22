# 广播路由与过滤规则

## 路由是纯代码逻辑

过滤决策完全由代码执行，不调用 LLM。
输入：`Event.tier1`（weight + participant_ids + tags + location_id）
输出：应接收此事件的 NPC ID 列表（分层级）

---

## 路由规则

```typescript
function routeEvent(event: EventTier1, allNpcs: NPC[]): RoutingResult {
  const result: RoutingResult = {
    direct_participants: [],    // 直接接收完整广播
    tier_a_recipients: [],      // Tier A NPC，接收 Tier 1+2
    tier_b_recipients: [],      // Tier B NPC，仅接收 Tier 1
  }

  for (const npc of allNpcs) {
    // 规则 1: 直接参与者，无论层级和位置
    if (event.participant_ids.includes(npc.id)) {
      result.direct_participants.push(npc.id)
      continue
    }

    // 规则 2: 私密事件不传播
    if (event.weight === "PRIVATE") continue

    // 规则 3: 按层级和权重决定
    if (npc.tier === "A") {
      if (event.weight === "MAJOR") {
        // 重大事件：所有 Tier A 都接收
        result.tier_a_recipients.push(npc.id)
      } else if (event.weight === "SIGNIFICANT") {
        // 显著事件：同地区的 Tier A 接收
        if (isSameRegion(npc.location, event.location_id)) {
          result.tier_a_recipients.push(npc.id)
        }
      } else {
        // 普通事件：强关系 Tier A 接收
        if (hasStrongRelationship(npc.id, event.participant_ids)) {
          result.tier_a_recipients.push(npc.id)
        }
      }
    } else if (npc.tier === "B") {
      // Tier B：仅同一场景内才接收普通及以上事件
      if (isSameScene(npc.location, event.location_id) &&
          event.weight !== "PRIVATE") {
        result.tier_b_recipients.push(npc.id)
      }
    }
    // Tier C：不接收任何广播
  }

  return result
}
```

---

## 关系距离判断

`hasStrongRelationship` 的判断依据来自关系图谱（代码查询，不调用 LLM）：

```typescript
function hasStrongRelationship(npc_id: string, target_ids: string[]): boolean {
  for (const target_id of target_ids) {
    const rel = RelationshipStore.get(npc_id, target_id)
    if (rel && rel.strength >= STRONG_RELATIONSHIP_THRESHOLD) return true
  }
  return false
}
```

关系强度 `strength` 是数值字段，从关系图谱中读取（不是语义描述，语义描述是另一个字段）。

---

## 二次传播（信息扩散）

二次传播由 **广播扩散器** 订阅 EventBus 后异步处理：

```
触发条件：event.weight >= "SIGNIFICANT"

计算扩散计划：
  - 目标：与 participants 有间接关系的 NPC（distance = 2）
  - 延迟：基于事件权重计算（SIGNIFICANT = 1-2 turns，MAJOR = 0-1 turns）
  - 传播内容：仅 Tier 2 摘要（不传播原文）

扩散执行：
  - 到达延迟时间 → 将 Tier 2 摘要注入目标 NPC 的待注入队列
  - NPC 下次被激活时，将此信息作为"听说了什么事"处理
  - NPC Agent 的主观过滤自然产生失真（不需要专门建模）
```

扩散计划写入 `PropagationSchedule`，由 `AgentScheduler` 按游戏内时间触发。
