# 01 LLM 与代码逻辑边界

## 边界划定原则

### LLM 负责

| 类别 | 具体职责 |
|------|---------|
| 语义理解 | 解析玩家自由文本意图、识别语气/情绪色彩、消解歧义 |
| 可行性语义判断 | "角色是否主观上知道这件事"、"关系是否允许此交互" |
| 内容生成 | 叙事文本、NPC 回复、内心声音、事件摘要与上下文 |
| 主观解读 | NPC 收到事件后生成自己的主观版本 |
| 推断 | 惰性求值补算、Lore 事实提取、一致性判断 |
| 评估 | 事件权重评估、信号 B 标注、偏移程度判断 |

### 代码负责

| 类别 | 具体职责 |
|------|---------|
| 流程控制 | Pipeline 步骤顺序、短路条件、是否进入仲裁 |
| 数值计算 | 特质权重衰减、阈值比较、Token 预算管理 |
| 路由决策 | 广播过滤规则、干预级别路由（基于 LLM 返回的评估结果） |
| 状态写入 | 所有持久化操作，LLM 永远不直接写状态 |
| 重试/错误处理 | LLM 不感知自己在重试，重试逻辑由 AgentRunner 管理 |
| 队列管理 | 注入队列的写入、过期清理、消费时机判断 |
| NPC 层级判断 | 升降级触发逻辑（基于交互计数，是代码规则） |

---

## 关键边界：语义判断的数据流

Domain 层发出语义判断请求 → AI 层执行 LLM 调用 → 返回结构化裁决 → Domain 层处理裁决结果的业务逻辑。

```
ArbitrationService（Domain）
    ↓ 调用接口 IArbitrationAI.judgeNarrativeFeasibility(...)
AI Layer 组装上下文 → LLM → 解析返回
    ↓ 返回 FeasibilityVerdict { passed: bool, reason: string, rejection_strategy: enum }
ArbitrationService 根据 passed 决定后续流程（代码路由）
```

LLM 返回的是**裁决数据**，不是流程指令。流程始终由代码控制。

---

## 结构化输出约定

所有 LLM 调用必须返回符合预定义 JSON Schema 的结构化数据。

**叙事文本**是唯一的例外——`narrative_text` 字段接受自由文本，但该字段的内容不被代码解析，只被传递至 Interface 层输出给玩家。

```json
// 正确：结构化返回，代码可消费
{
  "passed": true,
  "rejection_strategy": null,
  "signal_tags": ["ruthless", "impulsive"]
}

// 错误：自由文本作为可执行返回值
"The action seems feasible because the character knows the location."
```

详细的每个 LLM 调用 I/O 规范见 [input_output_contracts.md](./input_output_contracts.md)。
Prompt 工程规范见 [prompt_engineering_guide.md](./prompt_engineering_guide.md)。

---

## 各 Agent 的 LLM/代码职责分工

| Agent | LLM 调用 | 代码职责 |
|-------|---------|---------|
| 初始化 Agent | 世界生成（单次大型调用） | Schema 校验、分发到各存储 |
| 输入层 | 意图解析、消歧 | 原子动作序列构建、信号提取路由 |
| 反思系统 | 声音内容生成、辩论生成 | 阈值判断、坚持状态机、权重写入 |
| 仲裁层 | 语义可行性判断（第1/3/4/5层）、拒绝文本生成 | 物理可行性判断（第2层）、拒绝策略路由 |
| 事件 Agent | Tier 1-4 生成、权重评估、信号 B 标注 | 写入存储、触发广播 |
| 角色 Agent（NPC）| 回复生成、主观版本生成、自主意图生成 | 层级管理、记忆缓冲维护 |
| 世界 Agent | 惰性补算 | 冻结状态检测、补算触发时机判断 |
| 叙事轨道 Agent | 偏移评估、干预内容生成 | 注入队列写入、并行调度 |
| Lore 固化 | 事实提取、一致性判断 | 写入 LoreStore、触发传播更新 |
