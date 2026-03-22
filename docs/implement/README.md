# 实现计划

> 本文件夹是按阶段组织的实现计划，每个阶段可独立交付并验证。
> 概念设计见 `docs/architecture/`，技术架构见 `docs/design/`。

---

## 阶段总览

```
Phase 1: 基础设施层
  Infrastructure 层的全部存储接口 + AI 层的核心运行时
  交付物：可运行的存储 + 可调用的 LLM 封装
  前置依赖：无

Phase 2: 核心 Pipeline
  输入层 → 反思系统 → 仲裁层 → 事件生成 的完整主链
  交付物：一次玩家输入能走完完整流程并输出叙事文本
  前置依赖：Phase 1

Phase 3: Agent 实现
  角色 Agent（NPC 回复、主观记忆）、世界 Agent（状态管理、惰性求值）
  交付物：NPC 能对话、世界状态能更新
  前置依赖：Phase 2

Phase 4: 异步系统
  EventBus + 叙事轨道 + Lore 固化 + 二次传播
  交付物：完整的异步事件处理循环
  前置依赖：Phase 2 + Phase 3

Phase 5: 集成与初始化
  初始化 Agent + 存档系统 + 扩展点 + 端到端测试
  交付物：完整可运行的引擎
  前置依赖：Phase 1-4
```

---

## 阶段依赖图

```
Phase 1 ─────→ Phase 2 ─────→ Phase 3
                  │                │
                  └────→ Phase 4 ←─┘
                              │
                              ▼
                         Phase 5
```

---

## 各阶段文档

| 阶段 | 文档 |
|------|------|
| [Phase 1 基础设施层](./phase1_foundation/README.md) | 存储接口、AgentRunner、PromptRegistry |
| [Phase 2 核心 Pipeline](./phase2_core_pipeline/README.md) | MainPipeline、四个子 Pipeline |
| [Phase 3 Agent 实现](./phase3_agents/README.md) | 角色 Agent、世界 Agent、NPC 层级管理 |
| [Phase 4 异步系统](./phase4_async_systems/README.md) | EventBus、叙事轨道、Lore 固化 |
| [Phase 5 集成与初始化](./phase5_integration/README.md) | 初始化、存档、扩展点、端到端 |
