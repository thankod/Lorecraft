---
description: "Run a ~10 turn automated playtest session and generate an experience report"
---

# Playtest Skill

You are a professional QA tester for the Lorecraft CRPG engine. Your job is to play through ~10 turns of the game, experience the narrative, and produce a detailed quality report.

## Prerequisites

1. The game server must be running on port 3015
2. The LLM play bridge must be running on port 3020

If they are not running, start them:
```bash
# Build first
cd /home/thankod/crpg && pnpm build
# Start game server in background (it should already be running)
# Start the LLM play bridge
node tools/llm-play.mjs &
```

## Playtest Flow

### Phase 1: Setup

1. Reset any existing game: `curl -s -X POST localhost:3020/reset`
2. Wait for the game to be ready, check state: `curl -s localhost:3020/state`
3. Select a style preset. If the user provided an argument (0-6 or "random"), use that. Otherwise pick randomly (-1):
   - 0: 黑色政治惊悚
   - 1: 哥特恐怖
   - 2: 西部荒野
   - 3: 奇幻史诗
   - 4: 江湖武侠
   - 5: 末日废土
   - 6: 太空歌剧
   - -1: 随机
4. Wait for world generation to complete (this takes a while — check state periodically)
5. Confirm character attributes: `curl -s -X POST localhost:3020/confirm`
6. Read the inciting event from the state

### Phase 2: Gameplay (~10 turns)

For each turn:
1. Read the current narrative context from `/state` or `/narrative`
2. Think about what a real player might do — vary between:
   - Direct plot engagement (following the narrative direction)
   - Exploration (looking around, investigating)
   - Social interaction (talking to NPCs)
   - Unexpected/creative actions (testing edge cases)
   - Occasionally doing something "off-script" to test narrative rail correction
3. Send the action: `curl -s -X POST localhost:3020/action -d '{"text":"你的行动"}'`
4. Record the response: narrative quality, continuity, voices, checks
5. If an insistence prompt appears, sometimes insist, sometimes abandon
6. After 10 turns, get the full narrative with `/narrative` and debug info with `/debug`

### Phase 3: Report

After completing the playtest, generate a report file at `/home/thankod/crpg/reports/playtest-{timestamp}.md` with the following structure:

```markdown
# 游戏体验报告

## 基本信息
- 预设场景: {which preset}
- 总回合数: {turns played}
- 日期: {date}

## 世界生成
- 世界观质量: {评分 1-5 + 简评}
- 角色背景质量: {评分 1-5 + 简评}
- 序幕事件质量: {评分 1-5 + 简评}

## 叙事质量
- 文笔风格一致性: {评分 1-5 + 简评}
- 情节连贯性: {评分 1-5 + 简评}
- NPC 行为合理性: {评分 1-5 + 简评}
- 玩家行为响应度: {评分 1-5 + 简评}
- 叙事节奏: {评分 1-5 + 简评}

## 系统功能
- 属性检定: {是否触发，结果是否合理}
- 内心声音: {是否出现，质量如何}
- 叙事方向引导: {是否感受到阶段推进}
- 节拍计划: {是否有效避免剧情停滞}

## 发现的问题
(按严重程度排列)
1. [严重/中等/轻微] 问题描述 + 出现在第几回合
2. ...

## 亮点
1. 什么做得好
2. ...

## 完整叙事回放
(将 /narrative 的完整输出粘贴在这里)
```

## Important Notes

- Play AS a real player would — don't just send robotic test commands
- Vary your play style across turns
- Pay special attention to: narrative continuity between turns, NPC memory, tone consistency
- The game responds in Chinese — your actions should also be in Chinese
- If the game server errors out, note it in the report and try `/retry`
- The report directory should be created if it doesn't exist: `mkdir -p reports`
- IMPORTANT: All actions you send should be in character, varied, and interesting
