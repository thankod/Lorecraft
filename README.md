# Lorecraft

AI 驱动的对话式角色扮演游戏引擎。通过自然语言与 LLM 生成的世界交互——输入你想做的事，引擎负责判断可行性、推进叙事、演绎 NPC 反应。

## 快速开始

### 1. 安装依赖

```bash
pnpm install
```

### 2. 配置 API Key

```bash
mkdir -p ~/.config/lorecraft
cp .env.example ~/.config/lorecraft/.env
```

编辑 `~/.config/lorecraft/.env`，填入你的 API Key：

```env
# Google Gemini（推荐，免费额度充足）
GEMINI_API_KEY=your-key-here

# 或 Anthropic Claude
# ANTHROPIC_API_KEY=your-key-here
```

支持的 LLM：

| Provider | 环境变量 | 默认模型 |
|----------|---------|---------|
| Google Gemini | `GEMINI_API_KEY` | `gemini-2.5-flash` |
| Anthropic Claude | `ANTHROPIC_API_KEY` | `claude-sonnet-4-20250514` |
| OpenAI / 兼容 API | `OPENAI_API_KEY` | `gpt-4o` |

引擎会自动检测可用的 Key。如果配了多个，可通过 `LLM_PROVIDER=gemini` / `anthropic` / `openai` 指定。

OpenAI 兼容 API（如本地 LLM）额外设置：

```env
LLM_PROVIDER=openai
OPENAI_API_KEY=your-key
OPENAI_BASE_URL=http://localhost:11434/v1
```

### 3. 启动游戏

```bash
pnpm start
```

引擎会生成一个完整的游戏世界（背景、NPC、地点、阵营关系），然后你就可以用自然语言进行冒险了。

## 运行模式

### 单体模式（默认）

TUI 和引擎在同一进程内运行：

```bash
pnpm start
```

### 客户端-服务器模式

引擎作为 WebSocket 服务器独立运行，TUI 作为客户端连接：

```bash
# 终端 1：启动服务器
pnpm server

# 终端 2：连接客户端
pnpm client
```

自定义端口和地址：

```bash
pnpm start -- --server 8080
pnpm start -- --connect ws://192.168.1.100:8080
```

### Web 模式

一条命令同时启动 WebSocket 服务器（3015）和 Web 前端（3016）：

```bash
pnpm web
```

然后浏览器打开 `http://localhost:3016` 即可游玩。

也可以分别指定端口：

```bash
pnpm start -- --server 3015 --web 3016
pnpm start -- --web 8080  # WS 用默认 3015，Web 用 8080
```

### 调试模式

记录每次 LLM 调用的完整 prompt 和响应，用于排查问题：

```bash
pnpm start -- --debug
# 日志写入 ./debug.log

pnpm start -- --debug /tmp/lorecraft-debug.log
# 自定义日志路径
```

## 代理支持

如果需要通过代理访问 LLM API，设置标准环境变量即可：

```bash
export https_proxy=http://127.0.0.1:7890
pnpm start
```

## TUI 操作

| 按键 | 功能 |
|------|------|
| `Enter` | 发送输入 |
| `Esc` / `q` | 退出 |
| `Ctrl+S` | 存档 |
| `↑` `↓` / 鼠标滚轮 | 滚动叙事面板 |

## 项目结构

```
src/
├── ai/              # LLM 调用层（Provider、AgentRunner、响应解析）
├── domain/          # 领域模型与服务（世界生成、事件总线、信号处理）
├── orchestration/   # 管线架构（输入解析 → 反思 → 仲裁 → 事件生成）
├── infrastructure/  # 存储实现（内存 KV、事件日志、知识库）
├── server/          # WebSocket 服务器与通信协议
├── interface/       # TUI 前端（单体版 + 客户端版）
└── main.ts          # 入口，模式切换
```

## 引擎管线

每轮玩家输入经过以下处理：

1. **输入解析** — LLM 提取意图，生成原子动作
2. **内心反思** — 人格特质（逻辑、同理心、直觉、权威）对行动发表内心独白
3. **可行性仲裁** — LLM 五维评估（信息完整性、物理可行、社会可行、叙事可行、叙事偏移）
4. **节奏判断** — LLM 决定快速交互还是展开叙事
5. **事件生成** — LLM 生成叙事文本、状态变更、世界反应
6. **状态回写** — 更新角色记忆和世界状态，为下一轮提供上下文

## 开发

```bash
pnpm test          # 运行测试
pnpm test:watch    # 监听模式
pnpm build         # 构建
```

## License

MIT
