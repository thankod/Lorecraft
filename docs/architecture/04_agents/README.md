# 04 Agent 层

## 概述

引擎的核心由多个 Agent 构成，每个 Agent 负责世界的一个维度。
所有语义处理均由 AI 完成，Agent 之间通过结构化消息协作。

---

## Agent 一览

| Agent | 数量 | 状态 | 文档 |
|-------|------|------|------|
| 角色 Agent | N 个（每个角色一个） | 框架已定，细节 TODO | [character_agent.md](./character_agent.md) |
| 世界 Agent | 1 个 | TODO | [world_agent.md](./world_agent.md) |
| 事件 Agent | 1 个 | TODO | [event_agent.md](./event_agent.md) |

---

## 协作关系（草图）

```
角色 Agent（玩家）
    ↓ 意图（经过输入层、反思系统、仲裁层处理后）
事件 Agent
    ↓ 生成事件，广播状态变更
    ├→ 世界 Agent（更新世界状态）
    ├→ 相关角色 Agent（更新各自记忆与情绪）
    └→ 叙事轨道检查器（检测偏移）

NPC 角色 Agent（自主行动）
    ↓ 基于自身记忆和世界状态产生意图
    → 同样经过仲裁层 → 事件 Agent
```

Agent 间通信的详细设计见 [07 Agent 通信](../07_agent_communication/README.md)。
