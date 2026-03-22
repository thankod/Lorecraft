# Prompt 工程规范

## System Prompt 四区结构

所有 Agent 的 System Prompt 遵循统一的四区结构，区与区之间有明确分隔标记：

```
[IDENTITY]
角色身份与职责定义。
本 Agent 是谁，它的核心任务是什么。
静态区，不随运行时变化。

[WORLD_CONTEXT]
世界设定摘要。
来自初始化 Agent 的创世文档中的世界基调部分。
在游戏开始时写入，整个会话内不变。

[RUNTIME_CONTEXT]
当前运行时动态数据。
由 ContextAssembler 在每次调用前组装注入。
包含：角色当前状态、近期记忆摘要、当前场景、对话历史等。

[TASK_INSTRUCTION]
本次调用的具体任务指令。
包含输入数据和输出格式约束。
每次调用可能不同。
```

---

## Context 注入优先级与顺序

在 `[RUNTIME_CONTEXT]` 区内，按以下顺序注入（越靠近末尾优先级越高，LLM 更易"注意到"）：

```
1. 世界状态摘要（低优先级，背景信息）
2. 角色长期记忆召回（RAG 结果，中优先级）
3. 近期事件缓冲（高优先级，直接相关）
4. 角色当前状态（高优先级）
5. 待注入队列内容（最高优先级，叙事轨道注入）
```

---

## Token 预算分配约定

每次 LLM 调用的总 Token 预算按以下比例分配（比例可由 ContextAssembler 动态调整）：

| 区域 | 预算占比 | 说明 |
|------|---------|------|
| System Prompt 固定区（IDENTITY + WORLD） | ~15% | 基本不变 |
| RUNTIME_CONTEXT | ~50% | 动态组装，超出时按优先级截断 |
| TASK_INSTRUCTION + 输入数据 | ~20% | 本次任务 |
| 输出预留 | ~15% | 确保输出不被截断 |

---

## 输出格式约束

在 `[TASK_INSTRUCTION]` 末尾附加：

```
输出必须是合法的 JSON，符合以下 Schema：
<schema>
{ ... }
</schema>
不要输出 Schema 以外的任何内容。叙事文本字段（narrative_text）除外，该字段接受自由文本。
```

优先使用模型原生的 structured output / function calling 机制（如可用），
否则在 Prompt 末尾强制 JSON 格式约束。

---

## Prompt 版本管理

- Prompt 模板视为代码，存放在 `prompts/` 目录，纳入版本控制
- 文件名格式：`{agent_name}_{call_name}_v{version}.prompt`
- 生产环境使用的版本在 `PromptRegistry` 中显式指定
- 不允许在运行时动态拼接 Prompt 骨架（只允许注入数据到预定区域）

---

## 框架使用者的定制入口

游戏作者可以覆盖以下 Prompt 区域，其余区域框架锁定：

| 可覆盖区域 | 覆盖方式 | 影响范围 |
|-----------|---------|---------|
| 初始化 Agent `[IDENTITY]` 的风格配置 | 传入 `style_config` | 整个世界的基调 |
| NPC `[IDENTITY]` 的人格描述 | 在人物档案中定义 | 单个 NPC 的声音 |
| 事件 Agent 叙事风格注入 | 在 `[WORLD_CONTEXT]` 尾部追加 | 所有叙事文本的风格 |
| 第一层认知声音的描述 | 配置文件覆盖默认描述 | 内心声音的语气 |
