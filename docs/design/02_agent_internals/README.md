# 02 Agent 内部结构

## 统一的五步模型

系统中每个 Agent 在技术上都是同一个模式的实例：

```
Step 1: PromptTemplate
  静态骨架，定义四区结构（见 01_llm_boundary/prompt_engineering_guide.md）
  不含任何运行时数据

Step 2: ContextAssembler
  从多个数据源拉取数据，填充 [RUNTIME_CONTEXT] 和 [TASK_INSTRUCTION]
  管理 Token 预算，超出时按优先级截断
  纯代码，不调用 LLM

Step 3: LLM Call（via AgentRunner）
  组装完整 Prompt → 发送 LLM API → 等待响应
  AgentRunner 封装重试逻辑与超时处理

Step 4: ResponseParser
  JSON 反序列化 → Schema 校验 → 映射为 Domain 对象
  校验失败时决定是否重试或向上报错

Step 5: StateUpdate
  调用 Domain 层接口更新业务状态
  调用 Infrastructure 层写入持久化存储
  写入成功后通知 EventBus（如需广播）
```

---

## 各步骤的职责边界

### PromptTemplate
- 只包含骨架文本和区域占位符
- 不拼接运行时数据，运行时数据由 ContextAssembler 注入
- 存放于 `PromptRegistry`，通过 Agent 名称 + 调用名称索引

### ContextAssembler
- 是 AI 层的核心组件（见 [context_assembler.md](./context_assembler.md)）
- 每个 Agent 有自己的 ContextAssembler 实现，但遵循统一接口
- 声明式地描述需要哪些数据源，框架负责拉取

### AgentRunner
- 统一的 LLM 调用执行器，所有 Agent 共用一个 AgentRunner 实例
- 负责：API 调用、超时控制（可配置）、指数退避重试
- 记录每次调用的日志（输入 hash、输出 hash、耗时、状态）

### ResponseParser
- 每个 LLM 调用单元有对应的 Parser（见 [response_parser.md](./response_parser.md)）
- 叙事文本字段（`narrative_text`）直接透传，不做语义解析

### StateUpdate
- 是 Domain 层的一部分，不属于 AI 层
- 接收 Parser 输出的 Domain 对象，执行业务状态变更
- 所有写入操作幂等（支持因重试导致的重复调用）

---

## 各 Agent 在五步模型上的变体

| Agent | Step 2 特殊处理 | Step 4 特殊处理 | Step 5 特殊处理 |
|-------|---------------|----------------|----------------|
| 初始化 | 仅 style_config，极简 Context | 完整创世文档 Schema 校验 | 分发到 5 个不同存储位置 |
| 输入层 | 注入近期事件 + 场景描述 | 原子动作序列构建 | 写入特质权重更新队列 |
| 反思系统 | 注入活跃特质 + 待注入队列 | 辩论检测分支 | 坚持状态机更新 |
| 仲裁层 | 每层不同数据源，分次调用 | 拒绝策略枚举映射 | 无状态写入，只返回结果 |
| 事件 Agent | 注入完整参与者状态 | 事件完整 Schema 校验 | 写入 EventStore → 触发广播 |
| NPC Agent | 注入对话历史 + 待注入队列 | 情感变化信号提取 | 更新 NPC 状态 + 记忆缓冲 |
| 世界 Agent | 注入冻结快照 + 全局事件 | 补算事件列表解析 | 写入补算事件到 EventStore |
| 叙事轨道 | 注入叙事结构 + 近期事件流 | 干预级别枚举映射 | 写入注入队列（不写事件） |
| Lore 固化 | 注入 NPC 档案 + 现有 Lore | 事实列表解析 + 置信度过滤 | 写入 LoreStore + 更新 NPC 档案 |

---

## 错误传播规则

```
Step 3 超时/网络错误  → AgentRunner 重试（最多 N 次）→ 仍失败 → 向上冒泡至 Orchestration
Step 4 格式校验失败  → Parser 附加错误描述重新触发 Step 3 重试（最多 1 次）→ 仍失败 → 向上冒泡
Step 4 语义矛盾      → 直接向上冒泡，不重试
Step 5 写入失败      → Infrastructure 层重试 → 仍失败 → 向上冒泡至 Orchestration
```

Orchestration 层收到冒泡错误后：整条 Pipeline 停止，等待重试信号。
