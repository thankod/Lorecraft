# 06 存储与检索架构

## 存储需求矩阵

| 数据 | 写入模式 | 读取模式 | 推荐存储类型 |
|------|---------|---------|------------|
| Event（Tier 1-4）| 追加写，不修改 | 按 ID 精确查询；按时间范围扫描 | 追加写日志（append-only log）|
| WorldState | 更新写 | 按 ID 查询 | KV 存储 |
| CharacterState | 更新写 | 按 NPC ID 查询 | KV 存储 |
| SubjectiveMemory（缓冲）| 追加写，定期截断 | 按 NPC ID 范围查询 | KV 存储（有序列表）|
| SubjectiveMemory（长期）| 追加写 | 语义向量检索 | 向量数据库 |
| LoreEntry | 追加写（因果链增长）| 按 subject_id 查询；语义检索 | 结构化存储 + 向量索引 |
| TraitWeight | 更新写 | 按 trait_id 查询；全量读取 | KV 存储 |
| SessionStore | 一次写（创世文档）；快照追加 | 按 session_id 查询 | 文件存储或 KV |
| ConversationHistory | 追加写，定期压缩 | 按 NPC ID 范围查询 | KV 存储（有序列表）|

---

## 向量索引范围

**只对以下内容建立向量索引，不对 Tier 4 叙事文本建索引**：

- `Event.summary`（Tier 2）→ 用于主观记忆 RAG 检索
- `LoreEntry.content` → 用于 Lore 语义查询

向量索引分两个独立命名空间：
- `events:subjective:{npc_id}` → 每个 NPC 的主观记忆索引（独立）
- `lore:global` → 全局 Lore 向量索引

---

## 存储层接口定义（Infrastructure 层）

所有存储通过接口暴露，Domain 层和 AI 层不直接依赖具体存储实现：

```typescript
interface IEventStore {
  append(event: Event): Promise<void>
  getTier1(event_id: string): Promise<EventTier1>
  getTiers(event_id: string, tiers: number[]): Promise<Partial<Event>>
  scanByTimeRange(from: GameTimestamp, to: GameTimestamp): Promise<EventTier1[]>
  scanByParticipant(npc_id: string, limit: number): Promise<EventTier1[]>
}

interface IStateStore {
  get<T>(key: string): Promise<T | null>
  set<T>(key: string, value: T): Promise<void>
  // key 遵循命名空间规范，如 "world:location:{id}"
}

interface IVectorStore {
  upsert(namespace: string, id: string, vector: number[], metadata: object): Promise<void>
  query(namespace: string, query_vector: number[], top_k: number): Promise<VectorMatch[]>
}

interface ILoreStore {
  append(entry: LoreEntry): Promise<void>
  findBySubject(subject_id: string): Promise<LoreEntry[]>
  findByContentHash(hash: string): Promise<LoreEntry | null>
  semanticQuery(namespace: string, query: string, top_k: number): Promise<LoreEntry[]>
}
```

---

## 详细文档

- [持久化策略](./persistence_strategy.md)
- [RAG 检索设计](./rag_design.md)
- [惰性求值实现](./lazy_evaluation_design.md)
