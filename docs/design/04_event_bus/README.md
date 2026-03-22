# 04 事件总线（EventBus）

## 定位

EventBus 是内存内的发布/订阅机制，不是持久化消息队列：
- 事件已由 EventPipeline 持久化到 EventStore，EventBus 只负责通知
- 消费失败不回滚主链，记录日志，通过补算机制最终一致
- 所有消费者异步处理，不阻塞 Pipeline 主链

---

## 发布者与订阅者

**唯一发布者**：EventPipeline Step 7（EventAgent.StateUpdate）

**订阅者**：

| 订阅者 | 订阅方式 | 处理内容 |
|--------|---------|---------|
| 世界 Agent | 静态订阅（始终订阅所有事件）| 更新客观世界状态 |
| 叙事轨道 Agent | 静态订阅（始终订阅所有事件）| 偏移评估、干预决策 |
| Lore 固化模块 | 静态订阅（始终订阅）| 事实提取与固化 |
| 相关 NPC Agent | 动态订阅（按 event.participants 过滤）| 主观版本生成 |
| 广播扩散器 | 静态订阅（始终订阅）| 计算二次传播目标，延迟广播 |

---

## 消费者处理流程

每个订阅者收到事件 Tier 1 后：
1. 判断自己是否需要处理（过滤逻辑）
2. 按需从 EventStore 拉取更深层级（Tier 2/3/4）
3. 执行对应的 Agent 五步模型处理
4. 写入自己的状态

```
EventBus 广播 Tier 1
    ├→ 世界 Agent：读 Tier 1+2 → 更新地点/时间/势力状态
    ├→ 叙事轨道 Agent：读 Tier 1+2 → 评估偏移 → 写入注入队列（如需）
    ├→ Lore 固化：读 Tier 4 → 提取事实 → 写 LoreStore
    ├→ 相关 NPC Agent（Tier A）：读 Tier 1+2+3+4 → 生成主观版本 → 写记忆
    ├→ 相关 NPC Agent（Tier B）：读 Tier 1+2 → 更新状态
    └→ 广播扩散器：读 Tier 1+2 → 计算二次传播计划 → 写延迟队列
```

---

## 消费失败处理

```
消费者处理失败（LLM 错误、存储写入失败等）：
  → 最多重试 3 次（指数退避）
  → 仍失败 → 写入 DeadLetterQueue，记录 { event_id, subscriber, error }
  → 不影响主链，不影响其他消费者

DeadLetterQueue 的补偿机制：
  → 下次该 NPC/Agent 被激活时，检查 DeadLetterQueue
  → 找到未处理的事件 → 按时间顺序补偿处理
  → 补偿成功 → 从 DeadLetterQueue 移除
```

---

## 详细文档

- [事件 Schema](./event_schema.md)
- [广播路由规则](./broadcast_routing.md)
- [注入队列设计](./injection_queues.md)
