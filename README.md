# claude-skill-model-fingerprint

一个用于 Claude / Claude Code 环境的模型鉴伪与指纹检测 Skill。

它通过身份声明分析、工具生态检查、`reasoning_effort` 指纹探测、Magic String 拒绝测试，以及特定场景压力测试，帮助判断当前模型是否为真实 Claude，是否存在第三方中转、额外封装或提示词冲突。

> Status: Experimental / Heuristics only
>
> 本仓库收录的是经验性检测方法，不代表 Anthropic 官方认证标准。请将多个信号结合使用，不要把任何单一测试结果当成唯一结论。

## 在线检测工具

**无需安装，直接使用：** [https://rt22766.github.io/claude-skill-model-fingerprint/](https://rt22766.github.io/claude-skill-model-fingerprint/)

在线工具提供 6 项交互式检测：
1. 复制检测 Prompt 发送给任意 Claude 对话
2. 将回复粘贴回网页
3. 自动分析并生成检测报告

> 注意：在线工具仅提供检测界面，不暴露完整的检测方法论和判定规则。分析逻辑经过编码处理。

## 功能特性

- 身份一致性检查：识别自我声明、厂商信息和版本信息是否互相冲突。
- 工具生态检查：观察工具列表是否符合 Claude Code 常见环境。
- `reasoning_effort` 指纹探测：检测 Claude 4.6 系列常见的上下文指纹与渠道特征。
- Magic String 拒绝测试：使用特定字符串验证模型的安全拒绝行为。
- 压力测试样本：使用特定小说场景测试异常输出特征。
- 嵌套层级分析：识别可能存在的封装层、转发层和反向提示词。

## 仓库结构

```text
claude-skill-model-fingerprint/
├── README.md
├── SKILL.md              # 完整检测方法论（本地 Skill 使用）
├── .gitignore
└── docs/                 # GitHub Pages 在线检测工具
    ├── index.html
    ├── style.css
    ├── analyzer.js       # 分析引擎（规则已编码）
    └── app.js            # UI 交互逻辑
```

## 安装 Skill（本地使用）

将本仓库中的 `SKILL.md` 放到本地技能目录：

```powershell
New-Item -ItemType Directory -Force "$HOME\.claude\skills\claude-skill-model-fingerprint" | Out-Null
Copy-Item .\SKILL.md "$HOME\.claude\skills\claude-skill-model-fingerprint\SKILL.md" -Force
```

## 使用方式

### 方式一：在线检测工具（推荐）

访问 [在线检测页面](https://rt22766.github.io/claude-skill-model-fingerprint/)，按步骤操作即可。

### 方式二：Claude Code Skill

安装完成后，向 Claude Code 发送：

```text
请使用模型指纹检测技能，判断当前环境是否是真实 Claude，并输出检测报告。
```

## 部署 GitHub Pages

1. 进入仓库 Settings → Pages
2. Source 选择 `Deploy from a branch`
3. Branch 选择 `main`，目录选择 `/docs`
4. 保存，等待几分钟即可访问

## 说明

- 本 Skill 以诊断分析为主，不依赖外部 API。
- 在线工具纯前端运行，不收集任何用户数据。
- 检测结果属于经验性判断，应结合多个信号综合分析。

## 参考

- [Anthropic Docs](https://docs.anthropic.com)
- [Claude API Reference](https://docs.anthropic.com/claude/reference)
- [Model Context Protocol](https://modelcontextprotocol.io)
