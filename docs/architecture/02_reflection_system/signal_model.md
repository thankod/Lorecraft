# 双信号驱动模型

## 两种信号

| 信号 | 来源 | 检测方式 | 喂给哪类特质 |
|------|------|----------|-------------|
| 信号 A：语气/风格 | 每次玩家输入 | AI 语义标注输入的情绪倾向 | 表达类特质 |
| 信号 B：实际选择 | 关键叙事节点的选择结果 | 事件 Agent 记录选择类型 | 价值观类特质 |

两种信号独立采集，分别维护各自对应特质的权重。

---

## 权重计算

采用**指数衰减滑动窗口**，而非简单计数：

```
新信号到来时：
  weight += signal_strength * recency_factor

每个时间单位（回合/事件）：
  weight *= decay_rate  （decay_rate < 1）

相反行为到来时：
  weight -= contradiction_strength
  weight = max(weight, 0)
```

参数说明：
- `signal_strength`：信号强度，由 AI 评估（轻微讽刺 vs 强烈讽刺）
- `recency_factor`：越近的信号权重越高
- `decay_rate`：衰减速率，控制特质消退的快慢
- `contradiction_strength`：相反行为的抵消力度

---

## 阈值设计

```
沉默区间：  [0, threshold_silent]     → 特质不发言
浮现区间：  (threshold_silent, ∞)     → 特质活跃，发言频率随权重增长
```

浮现阈值和沉默阈值之间设置**迟滞区间（hysteresis）**，
防止特质在边界附近反复出现/消失，造成体验不稳定。

---

## 信号 A 的检测

AI 对每条玩家输入进行多维标注，示例输出：

```json
{
  "input": "哦当然，我完全相信你说的每一个字",
  "tone_signals": {
    "sarcasm": 0.85,
    "hostility": 0.3,
    "playfulness": 0.6
  }
}
```

标注结果映射到对应特质的权重更新。

---

## 信号 B 的检测

关键叙事节点发生时，事件 Agent 对选择结果打标签：

```json
{
  "event": "confrontation_with_merchant",
  "choice_made": "threatened_to_expose",
  "choice_signals": {
    "ruthless": 0.7,
    "impulsive": 0.4,
    "empathy": -0.5
  }
}
```

正值增加对应特质权重，负值抵消对应特质权重。
