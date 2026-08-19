<div align="center">

# ⚡ Token Meter

**AI 编程 Agent 实时 Token 消耗监控。看着你的 Token 在烧。**

[![npm](https://img.shields.io/npm/v/token-meter.svg)](https://www.npmjs.com/package/token-meter)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

</div>

---

## 这是什么

你的 AI Agent 正在跑。你想**现在就知道**每条命令花了多少 Token，而不是等会话结束。

```bash
npx token-meter
```

一个实时仪表盘，显示：

- **每条对话的实时 Token 消耗**
- **每条消息旁边的时间戳** — 什么时候发生的，花了多久
- **成本实时累加**
- **工具调用追踪** — 哪些工具在被调用，什么时候调用的

---

## 快速开始

```bash
# 全局安装
npm install -g token-meter

# 自动检测并监控所有 Agent
token-meter

# 监控指定 Agent
token-meter -a kimi-code
token-meter -a claude-code
token-meter -a codex

# 每 500ms 刷新一次
token-meter -i 500
```

## 输出效果

```
  ⚡ token-meter — 实时 Token 消耗监控
  ─────────────────────────────────────────────────
  正在监听 AI Agent 活动... (Ctrl+C 退出)

  ────────────────────────────────────────────────────────────────────
  会话: 64 │ Token: 2.3B │ 花费: $4681.95 │ 消息: 3256 │ 工具: 11570 │ 14:23:45
  ────────────────────────────────────────────────────────────────────
  你  请帮我检查一下项目结构                               [14:23:42]
  AI  我来检查一下你的项目...                              [14:23:43]
  工具 Bash ls -la                                        [14:23:44]
  📊  +1.2Kin / +89out                                    [14:23:44]
  AI  项目结构如下...                                      [14:23:46]
  你  看看有没有安全问题                                   [14:23:50]
  工具 Grep pattern: eval|exec|child_process              [14:23:51]
  📊  +3.4Kin / +234out                                   [14:23:51]
```

每一行右边都有时间戳。你可以精确看到每条消息什么时候发生，AI 花了多久回复。

---

## 命令行选项

```
token-meter [选项]

选项:
  -a, --agent <type>    Agent 类型 (kimi-code, claude-code, codex, opencode)
  -i, --interval <ms>   刷新间隔毫秒 (默认: 1000)
  -s, --session <id>    监控指定会话 ID
  --no-banner           隐藏横幅
  -h, --help            显示帮助
  -V, --version         显示版本
```

## 支持的 Agent

| Agent | 状态 |
|-------|------|
| **Kimi Code** | ✅ 已支持 |
| **Claude Code** | ✅ 已支持 |
| **Codex** | ✅ 已支持 |
| **OpenCode** | ✅ 已支持 |

---

## 工作原理

1. **实时监听本地会话文件**（不发网络请求）
2. **解析写入磁盘的新内容**
3. **从每一行提取 Token、消息、工具调用**
4. **在终端实时显示**，带时间戳

## 隐私

- ✅ 100% 本地运行 — 数据不会离开你的电脑
- ✅ 只读模式 — 不修改任何会话文件
- ✅ 不需要 API Key — 不依赖外部服务

---

## 相关项目

- [agent-trace](https://github.com/liangzhengtao/agent-trace) — 会话后分析工具（成本明细、工具健康度、异常检测）

## 许可证

[MIT](LICENSE)

---

## English Version

[README.md](README.md)
