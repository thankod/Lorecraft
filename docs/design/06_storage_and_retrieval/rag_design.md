# RAG 检索设计

## 检索流程

```
1. 构建查询向量
   输入：当前行动意图 + 角色当前状态摘要
   → 拼接为查询文本 → 调用 Embedding 模型 → 查询向量

2. 向量检索（VectorStore）
   命名空间：events:subjective:{npc_id}
   top_k：可配置（默认 5）
   → 返回语义最相关的 EventTier1+2 摘要

3. 按需加载全文
   对检索结果中相关性最高的 1-2 条，按需拉取 Tier 3+4
   其余条目只使用 Tier 2 摘要

4. 注入 ContextAssembler
   将召回结果按相关性排序，注入 [RUNTIME_CONTEXT] 区的长期记忆部分
```

---

## 索引写入时机

当 `MemoryBuffer` 条目移出缓冲区时（Tier A NPC 专属）：

```
MemoryBuffer.evict(entry)
  → 生成该条目 subjective_summary 的向量
  → VectorStore.upsert(
      namespace: "events:subjective:{npc_id}",
      id: entry.event_id,
      vector: embedding,
      metadata: { event_id, recorded_at_turn, distortion_type }
    )
```

---

## 主观与客观的向量空间隔离

每个 NPC 有自己独立的向量命名空间 `events:subjective:{npc_id}`，
保存的是该 NPC 的**主观摘要**的向量，而不是客观事件摘要的向量。

这意味着：
- 同一事件，不同 NPC 的主观摘要可能因扭曲而有语义差异
- 两个 NPC 的记忆检索结果天然不同（即使基于相同的查询）
- 客观事件的向量索引只在 Lore 检索时使用，不混入角色记忆检索

---

## Lore 语义检索

Lore 的语义检索用于仲裁层 Layer 4（叙事可行性检查）：

```
查询：当前行动 + 涉及的实体 ID
→ LoreStore.semanticQuery(namespace: "lore:global", query, top_k=3)
→ 返回最相关的 LoreEntry（含因果链）
→ 注入仲裁层 ContextAssembler
```

---

## Token 预算控制

RAG 召回结果注入 Context 时受 Token 预算约束（见 context_assembler.md）：

- 优先保留相关度最高的召回结果
- 超出预算时只保留 Tier 2 摘要，丢弃 Tier 3+4
- 最多注入 5 条长期记忆 + 3 条 Lore 条目
