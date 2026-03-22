# 特质权重数据模型

## TraitWeight

```typescript
type TraitType = "EXPRESSION" | "VALUE"

type TraitStatus = "SILENT" | "EMERGING" | "ACTIVE" | "FADING"

type TraitWeight = {
  trait_id: string
  trait_type: TraitType
  current_weight: number                // 0.0 到无上限（阈值决定激活）
  status: TraitStatus                   // 由代码根据 weight 和阈值计算，不持久化
  last_updated_turn: number
}
```

---

## TraitConfig（阈值配置）

每个特质的数值参数，存储在配置文件中（不在运行时数据库）：

```typescript
type TraitConfig = {
  trait_id: string
  trait_type: TraitType
  display_name: string          // 特质的显示名称（如 "戏谑"）
  voice_description: string     // 该声音的人格描述，注入 Prompt
  threshold_active: number      // weight 超过此值：声音开始发言
  threshold_silent: number      // weight 低于此值：声音沉默（< threshold_active）
  hysteresis_band: number       // 迟滞区间宽度（防止边界抖动）
  decay_rate: number            // 每 turn 衰减系数（0.0-1.0，如 0.95）
  signal_mapping: {             // 信号 A 的 tone key 到此特质的映射系数
    [tone_key: string]: number  // 正值增加 weight，负值抵消
  }
}
```

---

## 权重计算规则（SignalProcessor）

### 信号 A 更新（语气信号，每次输入）

```typescript
function applySignalA(trait_id: string, tone_signals: ToneSignals) {
  const config = TraitConfigStore.get(trait_id)
  let delta = 0
  for (const [tone_key, tone_value] of Object.entries(tone_signals)) {
    const mapping_coeff = config.signal_mapping[tone_key] ?? 0
    delta += tone_value * mapping_coeff
  }
  // delta 可正可负
  updateWeight(trait_id, delta)
}
```

### 信号 B 更新（选择信号，事件发生后）

```typescript
function applySignalB(choice_signals: ChoiceSignals) {
  for (const [trait_id, signal_value] of Object.entries(choice_signals)) {
    // signal_value 是 -1.0 到 1.0，直接作为 delta 的比例
    const delta = signal_value * SIGNAL_B_STRENGTH_MULTIPLIER
    updateWeight(trait_id, delta)
  }
}
```

### 衰减（每轮执行）

```typescript
function decayAllWeights(current_turn: number) {
  for (const trait of TraitWeightStore.getAll()) {
    const config = TraitConfigStore.get(trait.trait_id)
    const turns_since_update = current_turn - trait.last_updated_turn
    const decayed_weight = trait.current_weight * Math.pow(config.decay_rate, turns_since_update)
    TraitWeightStore.update(trait.trait_id, { current_weight: Math.max(0, decayed_weight) })
  }
}
```

---

## 状态计算（实时，不持久化）

```typescript
function getTraitStatus(trait_id: string): TraitStatus {
  const weight = TraitWeightStore.get(trait_id).current_weight
  const config = TraitConfigStore.get(trait_id)

  if (weight >= config.threshold_active) return "ACTIVE"
  if (weight >= config.threshold_active - config.hysteresis_band) return "EMERGING"
  if (weight >= config.threshold_silent + config.hysteresis_band) return "FADING"
  return "SILENT"
}
```

只有 `ACTIVE` 和 `EMERGING` 状态的特质才可能在 ReflectionPipeline 中发言。

---

## 权重更新日志（用于调试）

```typescript
type WeightUpdateLog = {
  trait_id: string
  delta: number
  signal_type: "A" | "B" | "DECAY"
  source_event_id: string | null
  before_weight: number
  after_weight: number
  turn: number
}
```

日志仅用于调试和分析，不影响游戏逻辑。
