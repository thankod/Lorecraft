# 07 初始化流程

## 初始化 Pipeline

初始化是一次性流程，在游戏首次启动时执行。与主链 Pipeline 相互独立。

```
Step 1: 加载游戏作者配置（代码）
  → 读取 style_config（有默认值，作者可覆盖）
  → 加载自定义 Prompt 覆盖（如有）

Step 2: 世界生成 LLM 调用（AI 层）
  → WorldGenerator（见 input_output_contracts.md）
  → 单次大型调用，生成完整创世文档
  → 这是系统中 token 消耗最大的单次调用

Step 3: 创世文档 Schema 校验（ResponseParser）
  → 必填字段完整性检查
  → tier_a_npcs 数量 [3, 7] 检查
  → narrative_phases 非空检查
  → 校验失败 → 重新生成（最多 3 次）

Step 4: 持久化创世文档（代码）
  → SessionStore.saveGenesis(document)
  → 生成 genesis_document_id

Step 5: 分发到各模块（代码，直接调用，不经过 EventBus）
  5a. → LoreStore: 写入 AUTHOR_PRESET 级别的 Lore（世界设定、NPC 档案）
  5b. → StateStore: 写入各地点初始状态、各势力初始状态
  5c. → 为每个 Tier A/B NPC 创建 CharacterDynamicState
  5d. → NarrativeRailService: 加载叙事结构（phases + final_goal）
  5e. → EventStore: 写入起始事件（inciting_event）

Step 6: 触发起始事件广播（代码）
  → EventBus.publish(inciting_event.tier1)
  → 与正常事件广播相同流程
  → 游戏正式开始
```

---

## 分发顺序约束

分发步骤有顺序依赖：

```
5a（Lore 写入）必须在 5c（NPC 状态创建）之前
  → NPCProfile 初始化时从 LoreStore 读取
5b（世界状态写入）必须在 5d（叙事轨道加载）之前
  → 叙事轨道需要初始世界状态作为偏移基准
5e（起始事件写入）必须在 Step 6（广播）之前
  → 保证事件存在后才广播
```

---

## 多存档复用创世文档

```
新游戏：
  → 执行完整初始化 Pipeline
  → 生成新的 genesis_document_id
  → 创建初始 SaveFile（指向此 genesis_document_id）

加载存档：
  → 读取 SaveFile.genesis_document_id
  → 从 SessionStore 加载对应 GenesisDocument
  → 恢复 SaveFile 中的状态快照
  → 跳过初始化 Pipeline（直接进入游戏循环）

同一创世文档的新存档（"重玩同一世界"）：
  → 复用已有 GenesisDocument
  → 重新执行 Step 5（重新初始化各模块状态）
  → 创建新的 SaveFile（指向同一 genesis_document_id）
```

---

## 生成质量的最低保证

Schema 校验之外，额外进行基础逻辑检查：

```typescript
function validateGenesisDocument(doc: GenesisDocument): ValidationResult {
  const errors: string[] = []

  // NPC 关系图一致性：A 说认识 B，B 的初始关系中应包含 A
  for (const npc of doc.characters.tier_a_npcs) {
    for (const [other_id, _] of Object.entries(npc.initial_relationships)) {
      const other = findNPC(doc, other_id)
      if (!other) errors.push(`NPC ${npc.id} 引用了不存在的 NPC ${other_id}`)
    }
  }

  // 叙事阶段连续性：不能有空的 phase
  for (const phase of doc.narrative_structure.phases) {
    if (!phase.direction_summary) errors.push(`叙事阶段 ${phase.phase_id} 缺少方向描述`)
  }

  return { valid: errors.length === 0, errors }
}
```

校验失败 → 附加错误信息重新调用 WorldGenerator（最多 3 次），超过次数则抛出初始化失败。
