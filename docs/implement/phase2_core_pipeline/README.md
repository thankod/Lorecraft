# Phase 2: 核心 Pipeline

## 目标
实现从玩家输入到叙事输出的完整主链。
Phase 2 完成后，可以输入一句话，经过解析→反思→仲裁→事件生成，输出叙事文本。
NPC 回复和异步处理在后续 Phase 中实现。

**前置依赖**：Phase 1（存储 + AgentRunner + 数据模型）

---

## 模块 2.1: Pipeline 框架

### 实现目标
实现 `docs/design/03_pipeline_design/README.md` 中的 Pipeline 基础框架。

### 实现内容

**2.1.1 Pipeline 接口**
- `IPipelineStep<TInput, TOutput>` 接口
- `PipelineContext`（会话级上下文，跨步骤传递数据）
- `StepResult` 三态返回：`continue` / `short_circuit` / `error`
- `MainPipeline` 编排器：按序执行 Step 1→2→3→4，处理短路和错误冒泡

**2.1.2 中间件支持**
- 日志中间件（每步骤的输入/输出/耗时记录）
- 调试中间件（可选：将每步结果序列化为 JSON 供调试）

### 验证标准
- Pipeline 可以编排多个 Step 按序执行
- 短路正确工作（中间步骤返回 short_circuit 后，后续步骤不执行）
- 错误冒泡正确工作

---

## 模块 2.2: 输入层 Pipeline（InputPipeline）

### 实现目标
实现 `docs/design/03_pipeline_design/input_pipeline.md`。

### 实现内容

**2.2.1 InputPipeline 各步骤**
- Step 1: 基础校验（非空、长度限制）—— 纯代码
- Step 2: InputParser LLM 调用
  - 实现 InputParser 的 ContextAssembler（注入当前位置、已知 NPC、近期事件、场景描述）
  - 填充 `input_parser_v1.prompt` 的实际内容
  - 实现 InputParser 的 ResponseParser（校验 `ParsedIntent` Schema）
- Step 3: 消歧处理（条件触发）
  - 仅当 `ambiguity_flags` 非空时调用 `AmbiguityResolver`
  - 填充 `ambiguity_resolver_v1.prompt`
- Step 4: 原子动作序列验证 —— 纯代码
- Step 5: 语气信号暂存（写入 PipelineContext，供 ReflectionPipeline 读取）

**2.2.2 原子动作类型枚举**
- 定义所有 `AtomicAction.type` 枚举值
- 初始集：`MOVE_TO`, `SPEAK_TO`, `EXAMINE`, `GIVE`, `CONFRONT`, `WAIT`, `THINK`
- 可扩展（游戏作者可在配置中注册自定义动作类型）

### 验证标准
- 输入自由文本，输出结构化的 `ParsedIntent`
- 歧义检测和消歧流程正确
- 校验拒绝非法的 action type

---

## 模块 2.3: 反思系统 Pipeline（ReflectionPipeline）

### 实现目标
实现 `docs/design/03_pipeline_design/reflection_pipeline.md`。

### 实现内容

**2.3.1 SignalProcessor（Domain 层）**
- 特质权重的指数衰减计算
- 信号 A 更新逻辑（`applySignalA`）
- 信号 B 更新逻辑（`applySignalB`）—— 接口准备，Phase 2 先由 EventPipeline 预留调用点
- 全量衰减（`decayAllWeights`）
- 阈值判断（`getTraitStatus`）返回 `SILENT/EMERGING/ACTIVE/FADING`
- 迟滞区间（hysteresis）防止边界抖动
- 数据模型：`docs/design/05_data_models/trait_weight_schema.md`

**2.3.2 ReflectionPipeline 各步骤**
- Step 1: 读取活跃特质 → `SignalProcessor.getActiveTraits()`
- Step 2: 读取待注入队列（此阶段队列为空，Phase 4 接入叙事轨道后生效）
- Step 3: 是否需要发言的判断逻辑（代码：有活跃特质 OR 有注入内容 OR 意图可疑）
  - 静默条件：跳过 LLM 调用，直接通过
- Step 4: TraitVoiceGenerator LLM 调用
  - 填充 `trait_voice_generator_v1.prompt`
- Step 5: DebateGenerator 条件触发
- Step 6: 短路/继续决策 + 坚持状态机
- Step 7: 权重更新写入

**2.3.3 坚持状态机**
- 三态状态机：`NORMAL → WARNED → INSISTING`
- 状态存储在 `PipelineContext` 的会话级变量中
- `force_flag` 和 `force_level` 的生成逻辑

### 验证标准
- 无活跃特质时静默通过（不调用 LLM）
- 活跃特质存在时生成内心声音
- 坚持状态机在多轮输入中正确转换
- 权重衰减和阈值判断在数值上正确

---

## 模块 2.4: 仲裁层 Pipeline（ArbitrationPipeline）

### 实现目标
实现 `docs/design/03_pipeline_design/arbitration_pipeline.md`。

### 实现内容

**2.4.1 ArbitrationService（Domain 层）**
- 五层检查的框架逻辑
- 并发查询 Query A + Query B（Layer 1/2/3 数据源）
- 顺序查询 Query C（Layer 4 数据源，仅在前三层通过后）
- 拒绝策略路由表（失败层级 → 默认策略映射）

**2.4.2 Layer 2 纯代码检查**
- 实现 `LocationGraph` 的可达性检查（`isReachable` 函数）
- 数据模型：`docs/design/05_data_models/world_state_schema.md` 中的 `LocationEdge`
- 目标对象在场检查（查 `NPCRoughLocation`）

**2.4.3 Layer 1/3/4/5 LLM 判断**
- 每层独立的 ContextAssembler（不同数据源）
- 填充 `narrative_feasibility_judge_v1.prompt`（同一模板，layer 参数不同）
- 每层独立的 ResponseParser（校验 `FeasibilityVerdict`）

**2.4.4 拒绝叙事生成**
- 仲裁不通过时调用 `RejectionNarrativeGenerator`
- 填充 `rejection_narrative_generator_v1.prompt`
- 返回 `NarrativeOutput`，Pipeline 短路

**2.4.5 Layer 5 drift_flag**
- Layer 5 不阻断主链，仅设置 `drift_flag`
- drift_flag 通过 PipelineContext 传递，在 Phase 4 由叙事轨道 Agent 消费

### 验证标准
- 明确不可行的动作（错误位置、不认识的 NPC）被正确拒绝
- 拒绝时生成的叙事文本自然（不暴露系统语言）
- 并发查询正确合并结果
- 通过时输出正确的 `ArbitrationResult`

---

## 模块 2.5: 事件 Pipeline（EventPipeline）

### 实现目标
实现 `docs/design/03_pipeline_design/event_pipeline.md`。

### 实现内容

**2.5.1 EventPipeline 各步骤**
- Step 1: 组装事件生成上下文（ContextAssembler）
- Step 2: EventGenerator LLM 调用
  - 填充 `event_generator_v1.prompt`
  - `force_level` 注入不同程度的负面后果提示
- Step 3: Schema 校验（ResponseParser）
- Step 4: 生成 event_id（UUID）
- Step 5: 写入 EventStore（先写事件，确保持久化）
- Step 6: SignalBTagger LLM 调用（条件触发，仅对有选择意义的事件）
  - 填充 `signal_b_tagger_v1.prompt`
  - 输出 `choice_signals` → 调用 `SignalProcessor.applySignalB()`
- Step 7: EventBus 广播占位（Phase 2 先打桩，Phase 4 实现实际广播）
- Step 8: 返回 `narrative_text` 给 Interface 层

**2.5.2 StateUpdate 逻辑**
- 事件的 `state_changes` 应用到 StateStore
- 写入顺序：EventStore → StateStore → EventBus（严格顺序）

### 验证标准
- 输入通过仲裁的动作，输出包含 Tier 1-4 的完整事件
- 事件写入 EventStore 后可读取
- `force_level > 0` 时叙事文本包含负面后果
- 信号 B 正确更新特质权重

---

## 模块 2.6: 端到端主链验证

### 验证场景

**场景 A：正常流程**
```
输入："走到市场看看有什么人"
→ 输入层解析为 MOVE_TO(市场) + EXAMINE(人群)
→ 反思系统静默通过（无活跃特质）
→ 仲裁层通过（位置可达、无限制）
→ 事件生成："你走进市场，人声鼎沸……"
```

**场景 B：仲裁拒绝**
```
输入："去市长办公室翻他的抽屉"
→ 输入层解析为 MOVE_TO(市长办公室) + EXAMINE(抽屉)
→ 仲裁 Layer 2：办公室门锁着 → 拒绝
→ 叙事拒绝："你走到市长办公室门前，门紧锁着。"
```

**场景 C：反思系统拦截 + 坚持**
```
输入第一轮："直接冲进去质问他"
→ 反思系统：规划声音发言 "你什么底牌都没有"
→ 短路，等待玩家
输入第二轮："我就是要质问他"
→ 坚持状态机 → force_flag=true, force_level=2
→ 仲裁通过 → 事件生成（附带负面后果）
```
