# 反思系统 Pipeline

## 步骤序列

```
输入：ParsedIntent（来自 InputPipeline）

Step 1: 读取当前活跃特质权重（代码）
  → SignalProcessor.getActiveTraits()
  → 返回权重超过 threshold_active 的特质列表

Step 2: 读取待注入队列（代码）
  → InjectionQueueManager.dequeue(REFLECTION_QUEUE)
  → 返回叙事轨道注入的内心声音提示（如有）

Step 3: 决定哪些声音需要发言（代码）
  → 评估意图的"问题程度"（基于 ambiguity_flags + action type）
  → 静默条件：意图明确合理 AND 无活跃特质 AND 无注入内容 → 直接通过
  → 有发言条件：活跃特质有立场 OR 注入内容存在 OR 意图触发第一层认知

Step 4: 声音内容生成（LLM 调用）
  → TraitVoiceGenerator
  → 输出：voices[], debate_needed

Step 5: 辩论生成（LLM 调用，条件触发）
  → 触发条件：debate_needed = true AND 至少两个声音立场相对
  → DebateGenerator
  → 输出：debate_lines[]

Step 6: 输出声音文本（短路 or 继续）
  拦截模式（意图明显不可行）：
    → 短路，返回声音文本，等待玩家确认是否坚持
  提醒模式（意图可疑但未拦截）：
    → 声音文本追加在输出中，继续传入仲裁层
  静默模式（无声音）：
    → 直接传入仲裁层，无附加输出

Step 7: 更新特质权重（代码）
  → SignalProcessor.applySignalA(tone_signals from ParsedIntent)
  → 指数衰减计算，阈值检查，写入 TraitWeightStore
```

---

## 坚持状态机

当声音拦截后，玩家可以坚持原意图。状态机由代码管理：

```
状态：NORMAL → WARNED → INSISTING

NORMAL:
  声音提醒后 → 进入 WARNED 状态（本轮短路）

WARNED（等待玩家下一轮输入）:
  玩家修改意图 → 返回 NORMAL
  玩家重复相同意图 → 进入 INSISTING（携带 force_level=1 继续流程）
  玩家明确表达"我就是要这么做" → 进入 INSISTING（携带 force_level=2 继续流程）

INSISTING:
  继续进入仲裁层，force_flag=true，force_level 传入事件 Agent
  本轮完成后 → 返回 NORMAL
```

---

## 特质权重更新时机

信号 A（语气信号）的权重更新在 **Step 7** 执行，即仲裁和事件完成之前。
信号 B（选择信号）的权重更新在 **EventPipeline Step 6** 执行，即事件写入后。

两种信号的更新时机不同，确保：
- 信号 A 反映玩家的输入风格（不依赖仲裁结果）
- 信号 B 反映玩家的实际选择（依赖事件确实发生）
