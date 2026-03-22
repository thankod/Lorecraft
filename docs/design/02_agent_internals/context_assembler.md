# ContextAssembler 设计规范

## 职责

ContextAssembler 是 AI 层的核心数据组装器：
- 从 Infrastructure 层的多个数据源拉取数据
- 按优先级和 Token 预算组合，填充 Prompt 的动态区
- 不调用 LLM，不含业务逻辑
- 每个 Agent 有对应的 ContextAssembler 实现，共享统一接口

---

## 统一接口

```
interface IContextAssembler {
  assemble(
    agent_type: AgentType,
    call_name: string,
    runtime_params: RuntimeParams
  ) → AssembledContext
}

type AssembledContext = {
  system_prompt: string,     // 完整拼装后的 System Prompt
  user_message: string,      // 本次调用的用户消息（任务数据）
  token_budget_used: number
}
```

---

## 数据源与优先级

各数据源按优先级从低到高排列，高优先级数据在 Token 超出时最后被截断：

| 优先级 | 数据源 | 获取方式 | 适用 Agent |
|--------|--------|---------|-----------|
| 1（最低）| 世界状态摘要 | StateStore 查询 | 仲裁层、事件 Agent、世界 Agent |
| 2 | Lore 相关条目 | LoreStore 语义查询 | 仲裁层、NPC Agent |
| 3 | 长期记忆召回（RAG）| VectorStore 检索 Tier 2 | NPC Agent、角色 Agent |
| 4 | 近期事件缓冲 | MemoryBuffer 直接读取 | 所有 Agent |
| 5 | 角色当前状态 | StateStore 查询 | NPC Agent、角色 Agent |
| 6（最高）| 待注入队列内容 | InjectionQueueManager | NPC Agent、反思系统 |

---

## Token 预算管理

```
total_budget = model_context_window - output_reserved
static_budget = len(static_prompt_sections)
dynamic_budget = total_budget - static_budget

各数据源按优先级从高到低填充，直到 dynamic_budget 耗尽
超出预算时，低优先级数据截断（不是丢弃，是摘要压缩后再尝试）
```

压缩策略：
- 长期记忆召回结果超出时：只保留相关度最高的前 K 条
- 近期事件缓冲超出时：只保留最近 M 条
- 对话历史超出时：保留首尾，压缩中间段

---

## 各 Agent 的数据源配置

### 输入层 ContextAssembler
```
数据源：
  - 角色当前位置和已知 NPC 列表（StateStore）
  - 近期 3 条事件摘要（MemoryBuffer）
  - 当前场景描述（StateStore）
```

### 反思系统 ContextAssembler
```
数据源：
  - 当前活跃特质列表及权重（SignalProcessor）
  - 待注入队列内容（InjectionQueueManager）
  - 本次意图摘要（来自输入层输出，通过 Pipeline 传递）
```

### 仲裁层 ContextAssembler（per layer）
```
Layer 1/3：角色主观记忆近期缓冲 + RAG 召回（VectorStore）
Layer 2：  世界客观状态（StateStore）—— 纯代码不需要 LLM
Layer 4：  Lore 条目 + 事件历史（LoreStore + EventStore）
Layer 5：  叙事结构摘要（叙事轨道 Agent 的状态）
```

### NPC Agent ContextAssembler
```
数据源：
  - NPC 人物档案摘要（LoreStore）
  - NPC 当前状态（StateStore）
  - 关系描述（角色 Agent 关系图谱）
  - 对话历史（近期 N 轮）
  - 近期记忆缓冲（MemoryBuffer）
  - RAG 召回相关主观记忆（VectorStore）
  - 待注入队列（InjectionQueueManager）
```

### 叙事轨道 Agent ContextAssembler
```
数据源：
  - 叙事结构摘要（初始化时写入，常驻）
  - 近期 K 条事件的 Tier 1+2（EventStore）
  - 上次干预记录（StateStore）
```

---

## 冷启动场景

当角色/NPC 是新建立的（无历史记忆）：
- RAG 召回为空 → 跳过，不填充
- 近期事件缓冲为空 → 填充"角色刚刚到达这里"的初始场景描述
- NPC 无对话历史 → 从人物档案中提取初次见面的适当描述
