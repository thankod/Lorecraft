# 08 错误处理策略

## 核心原则：阻塞式，无降级

任意 Agent 调用失败 → 整条 Pipeline 停止 → 等待重试成功后继续。
不允许在部分失败的状态下推进流程，确保世界状态始终完整一致。

对玩家的呈现：Interface 层在 Pipeline 停止期间显示等待状态（具体形式由框架使用者决定，框架只暴露 `PipelineStatus.WAITING` 状态）。

---

## 错误分类与处理

| 错误类型 | 触发场景 | 处理方式 | 重试策略 |
|---------|---------|---------|---------|
| `LLM_TIMEOUT` | API 调用超时 | AgentRunner 重试 | 指数退避，最多 3 次 |
| `LLM_NETWORK_ERROR` | 网络中断 | AgentRunner 重试 | 指数退避，最多 3 次 |
| `LLM_INVALID_JSON` | 响应非合法 JSON | ResponseParser 重试（附加错误提示）| 最多 1 次额外重试 |
| `LLM_SCHEMA_VIOLATION` | 响应缺字段/类型错误 | ResponseParser 重试（附加缺失字段提示）| 最多 1 次额外重试 |
| `LLM_SEMANTIC_CONFLICT` | 响应内部语义矛盾 | 硬失败，向上冒泡 | 不重试 |
| `STORAGE_WRITE_FAILURE` | 持久化写入失败 | Infrastructure 层重试 | 最多 5 次，指数退避 |
| `STORAGE_READ_FAILURE` | 读取失败 | Infrastructure 层重试 | 最多 3 次 |
| `VALIDATION_FAILURE` | Schema/逻辑校验失败 | 向上冒泡至 Orchestration | 视具体情况 |

---

## AgentRunner 重试逻辑

```typescript
async function runWithRetry<T>(
  call: () => Promise<string>,
  parser: IResponseParser<T>,
  max_retries: number = 3
): Promise<T> {
  let last_error: string | null = null

  for (let attempt = 0; attempt <= max_retries; attempt++) {
    const delay_ms = attempt > 0 ? Math.pow(2, attempt - 1) * 1000 : 0
    if (delay_ms > 0) await sleep(delay_ms)

    try {
      const raw = await call()
      const result = parser.parse(raw)

      if (result.ok) return result.data

      if (!result.retryable) throw new NonRetryableError(result.message)

      // 可重试：将错误信息附加到下次调用的 prompt
      last_error = result.message
      // 修改 call 以附加错误反馈（通过闭包更新 context）
      call = appendErrorFeedback(call, last_error)

    } catch (e) {
      if (e instanceof NonRetryableError) throw e
      last_error = e.message
    }
  }

  throw new MaxRetriesExceededError(last_error)
}
```

---

## Orchestration 层的错误处理

```typescript
// MainPipeline 的错误边界
async function runMainPipeline(input: PlayerInput): Promise<NarrativeOutput> {
  try {
    const ctx = createPipelineContext(input)
    // ... 执行各步骤
    return finalOutput
  } catch (error) {
    // 记录完整错误链
    logger.error({ pipeline_error: error, context: ctx })

    // 更新 Pipeline 状态
    setPipelineStatus(ctx.session_id, "WAITING_RETRY")

    // 向 Interface 层报告等待状态
    throw new PipelineBlockedError(error)
  }
}
```

Interface 层收到 `PipelineBlockedError` 后向玩家展示等待状态，并提供重试触发入口。

---

## EventBus 消费失败（不影响主链）

```typescript
// EventBus 消费者的错误边界（异步，独立于主链）
async function safeConsume(subscriber: IEventSubscriber, event: EventTier1) {
  try {
    await subscriber.handle(event)
  } catch (error) {
    logger.error({ subscriber: subscriber.name, event_id: event.id, error })

    // 写入死信队列，等待补偿
    await DeadLetterQueue.push({
      event_id: event.id,
      subscriber_name: subscriber.name,
      error_message: error.message,
      failed_at_turn: currentTurn
    })
  }
}
```

---

## 调试日志规范

每次 LLM 调用记录：

```typescript
type LLMCallLog = {
  call_id: string
  agent_type: string
  call_name: string
  attempt_number: number
  input_hash: string          // 不记录原始 prompt（可能含敏感叙事内容）
  output_hash: string
  duration_ms: number
  status: "SUCCESS" | "RETRY" | "FAILED"
  error_type: string | null
  turn: number
}
```
