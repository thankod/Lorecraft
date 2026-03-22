# 输入层 Pipeline

## 步骤序列

```
输入：raw PlayerInput string

Step 1: 基础校验（代码）
  - 非空检查
  - 长度限制检查
  - 输出：通过的原始文本

Step 2: InputParser LLM 调用（AI 层）
  - ContextAssembler 组装：当前位置、已知 NPC、近期 3 条事件摘要、当前场景
  - 调用 InputParser（见 input_output_contracts.md）
  - 输出：ParsedIntent { intent, tone_signals, atomic_actions[], ambiguity_flags[] }

Step 3: 消歧处理（条件触发）
  - 触发条件：ambiguity_flags 非空
  - 对每个含歧义的 atomic_action 调用 AmbiguityResolver
  - 将解析结果合并回 atomic_actions[]

Step 4: 原子动作序列验证（代码）
  - 确保 atomic_actions 非空
  - 确保每个 action.type 是已知枚举值
  - 按 action.order 排序

Step 5: 信号 A 提取写入（代码）
  - 将 tone_signals 写入 TraitWeightQueue（异步处理，不阻塞）
  - 不在此步骤直接更新权重，由 ReflectionPipeline Step 7 统一处理

输出：AtomicActionSequence[]，传入 ReflectionPipeline
```

---

## 与 ReflectionPipeline 的数据接口

```
type InputPipelineOutput = {
  original_text: string,
  intent: string,
  tone_signals: ToneSignals,
  atomic_actions: AtomicAction[],
  ambiguity_resolved: boolean
}
```

此对象通过 `PipelineContext` 传递，ReflectionPipeline 直接从 context 中读取。
