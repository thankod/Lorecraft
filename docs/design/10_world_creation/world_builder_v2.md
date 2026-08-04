# 世界生成器 V2：分支世界语法

> 状态：已实现。本文是世界选择、协议校验和 Prompt 注入的权威设计；`README.md` 中旧的全局六维模型仅作历史参考。

## 1. 核心决定

V2 不使用文明、传统、舞台、社会、技术、超自然六个全局轴做自由笛卡尔积，而采用：

```text
一个世界大类（分支联合类型）
  + 该大类专属的 4～6 个问题
  + 最多两个跨世界故事主题
  + 一个整体气质
```

世界大类负责“这个世界能否成立”；故事主题和气质负责“玩家想在其中体验什么”。

## 2. 八个世界大类

| 大类 | 专属问题 |
|---|---|
| 当代现实 | 主要生活环境、社会场域、社会状态、现实质感 |
| 现代异闻 | 普通环境、异常来源、公开程度、社会应对、异常密度 |
| 历史人间 | 时代面貌、文明参考、主要舞台、政治秩序、历史关系 |
| 武侠江湖 | 时代环境、主要舞台、江湖秩序、武学上限、公开状态 |
| 东方幻想 | 幻想传统、世界范围、主要舞台、力量掌握者、力量普及度 |
| 西方奇幻 | 技术时代、魔法普及度、主要舞台、政治秩序、族群关系 |
| 科学未来 | 未来尺度、主要舞台、权力结构、科技方向、非人智慧、科学感 |
| 灾变余生 | 灾变来源、灾后时间、主要舞台、社会秩序、技术保留程度 |

每个问题支持 `AUTO`。Resolver 在本分支内部确定性地补全，不调用 LLM 或随机数。

## 3. 依赖约束

前端根据父问题过滤子选项，服务端用同一套 Zod Schema 再次拒绝非法 Payload。

已实现的关键约束包括：

- 近未来地球可出现“科技巨头影响显著”，但不能出现拥有主权的“企业领地”。
- 巨型空间站、核心行星和星际飞船只属于星际尺度。
- 历史世界的工业都市和殖民城市只属于工业初兴或城市化近代。
- 现代异闻的社会应对方式必须服从异常公开程度。
- 民俗志怪默认保持人间尺度，不能无桥接地选择多重宇宙。
- 魔法公共设施要求工业萌芽或魔法技术文明。

父问题变化时，已经不兼容的子答案重置为 `AUTO`。切换世界大类时，整个旧 `kernel` 被替换，不保留其他分支字段。

## 4. Draft 与解析结果

```typescript
interface WorldCreationDraft {
  schema_version: 2
  kernel: WorldKernelDraft | null
  source_preset_id: string | null
  primary_theme: StoryTheme | null
  secondary_theme: StoryTheme | null
  mood: StoryMood | 'AUTO'
  custom_requirements: string
  excluded_content: string
}

type WorldKernelDraft =
  | ContemporaryKernelDraft
  | ModernAnomalyKernelDraft
  | HistoricalKernelDraft
  | WuxiaKernelDraft
  | EasternFantasyKernelDraft
  | WesternFantasyKernelDraft
  | ScienceFictionKernelDraft
  | PostCollapseKernelDraft

interface ResolvedWorldBrief {
  schema_version: 2
  kernel: ResolvedWorldKernel // 不含 AUTO
  themes: [StoryTheme] | [StoryTheme, StoryTheme]
  mood: Exclude<StoryMood, 'AUTO'>
  custom_requirements: string
  excluded_content: string
  guidance: RuntimeGuidance
}
```

## 5. 跨世界故事主题

主题最多选择两个，第一个决定主要运行时指导：

- 日常生活、人与关系、爱情情感、成长
- 事业经营、竞技奋斗
- 冒险、悬疑、生存、惊悚恐怖
- 权谋、战争与时代、文明建设

`DAILY` 映射为 `CALM + OPEN`，因此日常世界无需核心冲突、反派或危机升级。气质只影响表达，不直接改变故事压力。

## 6. 预设

预设是完整合法 Draft 的快照，不是新的世界类型。V2 内置：

- 现代都市、校园青春、温馨小镇、现代异闻
- 古代生活、宫廷权谋、江湖武侠、东方仙侠
- 西方王国、魔法学院、近未来都市、星际远航、末日废土

应用预设会保留用户的内容排除项；修改任一配置后取消预设绑定。

## 7. 交互

简单模式只显示大类、故事主题和气质。详细模式在同一份 Draft 上增加当前大类专属问题和可选补充文本。

右侧实时预览可以在主题尚未选择时展示已解析的世界内核，但“继续设定人物”必须等到大类和主主题都已选择。

世界页不出现性别、身份和属性。进入下一步后，玩家必须明确选择男性或女性，世界舞台不得推断玩家身份。

## 8. Prompt 合同

WorldGenerator 接收：

```json
{
  "public_world_brief": {
    "schema_version": 2,
    "world_kernel": {
      "family": "SCIENCE_FICTION",
      "future_scale": "NEAR_FUTURE_EARTH",
      "stage": "FUTURE_MEGACITY",
      "authority": "TECH_GIANTS"
    },
    "themes": ["RELATIONSHIP", "MYSTERY"],
    "mood": "COLD"
  },
  "runtime_guidance": {},
  "player_profile": {},
  "retry_context": null
}
```

`world_kernel` 是代码校验后的权威分支合同。Prompt 不得引入其他大类的惯例，也不得把 `TECH_GIANTS` 擅自升级为 `CORPORATE_TERRITORIES`。

世界选择阶段不得推断玩家的性别、年龄、职业、阶层、能力和感情关系。

## 9. 测试要求

- 同一 Draft 必须得到相同 ResolvedWorldBrief。
- 服务端协议拒绝缺少大类、主主题或带有非法依赖的 Draft。
- 父分支切换必须清理子字段。
- Prompt Payload 只包含结构化公开世界信息，不插值到 System Prompt。
- ResolvedWorldBrief 不得含有玩家性别、属性或身份字段。
