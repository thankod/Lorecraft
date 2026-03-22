# 仲裁层 Pipeline

## 设计原则

- 五维评估合并为**单次 LLM 调用**，减少延迟和 token 消耗
- 所有上下文（主观记忆、客观状态、Lore、近期事件）在调用前并发查询
- LLM 自由判断各维度是否通过，不通过时直接生成叙事内拒绝文本
- 无硬编码枚举——动作类型、拒绝策略均由 LLM 语义判断

---

## 步骤序列

```
输入：AtomicAction（单个原子动作）+ PipelineContext

// 并发查询阶段（代码）
ParallelQueryStep:
  Promise.all([
    主观记忆（memory:subjective:{characterId}）    → 用于信息/社交维度
    客观世界状态（world:objective:{characterId}）   → 用于物理/空间维度
    Lore 相关条目（按 action.target 查询）          → 用于叙事维度
    近期事件历史（最近 10 条 Tier1 标题）            → 用于叙事/漂移维度
  ])

// 单次 LLM 评估
FeasibilityCheckStep:
  将动作 + 所有上下文传给 LLM，要求评估五个维度：
    1. 信息完整性
    2. 空间/状态可行性
    3. 社会/关系可行性
    4. 叙事可行性
    5. 叙事漂移（仅标记，不拒绝）

  LLM 返回综合报告：
    ├─ passed: false → 报告中包含 rejection_narrative → 短路返回
    └─ passed: true → 继续
        drift_flag 写入 context，由异步叙事轨道 Agent 处理

// 汇总结果
ArbitrationResultStep:
  组装 ArbitrationResult { passed, action, force_flag, force_level, drift_flag }
  传递给事件 Pipeline

输出：ArbitrationResult
```

---

## LLM 输入/输出

### 输入

```json
{
  "action": { "type": "MOVE_TO", "target": "mayor_office", "method": null, "order": 0 },
  "subjective_memory": { ... },
  "objective_world_state": { ... },
  "lore_context": [ ... ],
  "recent_events": ["事件标题1", "事件标题2"]
}
```

### 输出

```json
{
  "passed": boolean,
  "checks": [
    { "dimension": string, "passed": boolean, "reason": string | null }
  ],
  "drift_flag": boolean,
  "rejection_narrative": string | null
}
```

- `checks` 数组包含五个维度的逐项评估
- `rejection_narrative` 仅在 `passed: false` 时有值，是面向玩家的叙事文本
- `drift_flag` 独立于 passed/failed，第五维永远不阻断动作

---

## 与旧设计的对比

| 方面 | 旧设计 | 新设计 |
|------|--------|--------|
| LLM 调用次数 | 4-5 次（Layer 1/3/4/5 各一次 + 拒绝叙事） | 1 次 |
| 物理检查 | 硬编码（LocationGraph + NPC 在场） | LLM 基于世界状态语义判断 |
| 拒绝策略 | 枚举路由（NARRATIVE_ABSORB / PARTIAL_EXEC / REINTERPRET） | LLM 自由选择 |
| 动作类型 | 7 种枚举，未知类型报错 | 开放字符串，LLM 可使用任意动词 |
| 延迟 | 串行多次调用 | 并发查询 + 单次评估 |
