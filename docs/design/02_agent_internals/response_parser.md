# ResponseParser 设计规范

## 职责

- JSON 反序列化与 Schema 校验
- 将 LLM 输出映射为 Domain 层可消费的类型化对象
- 决定校验失败时的处理策略（重试 vs 硬失败）
- `narrative_text` 字段直接透传，不做语义解析

---

## 统一接口

```
interface IResponseParser<T> {
  parse(raw_response: string) → ParseResult<T>
}

type ParseResult<T> =
  | { ok: true, data: T }
  | { ok: false, error_type: ParserErrorType, message: string, retryable: bool }

enum ParserErrorType {
  INVALID_JSON,        // JSON 格式错误，可重试
  SCHEMA_VIOLATION,    // 缺字段或类型错误，可重试
  ENUM_VIOLATION,      // 枚举值不在允许范围内，可重试
  SEMANTIC_CONFLICT,   // 内部语义矛盾，不可重试
}
```

---

## 重试判断规则

| 错误类型 | 处理方式 | 重试时的附加提示 |
|---------|---------|----------------|
| `INVALID_JSON` | 重试一次 | "你的上一次输出不是合法 JSON，请重新输出" |
| `SCHEMA_VIOLATION` | 重试一次 | "缺少必填字段：{field_name}，请确保输出包含所有必填字段" |
| `ENUM_VIOLATION` | 重试一次 | "字段 {field} 的值 {value} 不在允许范围 {enum_values} 内" |
| `SEMANTIC_CONFLICT` | 硬失败，向上报错 | 不重试 |

每种可重试错误最多重试 **1 次**（重试本身已在 AgentRunner 的网络错误重试之外）。

---

## 叙事文本字段的特殊处理

`narrative_text` 字段是系统中唯一的自由文本字段：
- 只做长度检查（不能为空，不超过 max_narrative_length）
- 不做语义校验，不做格式转换
- 解析成功后直接放入 Domain 对象，不经过任何代码分析
- 最终由 Interface 层原样输出给玩家

---

## 各 Agent 的 Parser 要点

### InputParser → `ParsedIntent`
- `atomic_actions` 数组不能为空（玩家输入必须产生至少一个动作）
- `tone_signals` 所有值必须在 [0.0, 1.0] 范围内
- `type` 字段必须是预定义动作类型枚举之一

### EventGenerator → `GeneratedEvent`
- `weight` 必须是 `PRIVATE | MINOR | SIGNIFICANT | MAJOR`
- `state_changes` 数组可以为空（纯对话事件可能没有状态变更）
- `narrative_text` 不能为空

### NarrativeFeasibilityJudge → `FeasibilityVerdict`
- `passed: false` 时，`rejection_strategy` 必须非空
- `passed: true` 时，`rejection_strategy` 必须为 null

### SubjectiveMemoryGenerator → `SubjectiveMemory`
- `distortion_type` 为 `NONE` 时，`subjective_summary` 应与客观摘要高度相似（但 Parser 不做此校验，是 Prompt 质量问题）

### WorldGenerator → `GenesisDocument`
- 这是系统中最复杂的 Schema，校验最严格
- `tier_a_npcs` 数组长度必须在 [3, 7] 范围内
- `narrative_phases` 数组不能为空
- 关键字段缺失时触发重新生成（而非重试单次解析）
