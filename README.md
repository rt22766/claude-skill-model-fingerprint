# claude-skill-model-fingerprint

一个用于 Claude / Claude Code 环境的模型鉴伪与指纹检测 Skill。

它默认通过 `reasoning_effort` 指纹、Magic String、综合知识与自我认知压力测试来快速判断当前模型是否为真实 Claude；只有在需要时才进一步加载深度审查规则。

> Status: Experimental / Heuristics only
>
> 本仓库收录的是经验性检测方法，不代表 Anthropic 官方认证标准。请将多个信号结合使用，不要把任何单一测试结果当成唯一结论。

## 功能特性

- 身份一致性检查：识别自我声明、厂商信息和版本信息是否互相冲突。
- 工具生态检查：观察工具列表是否符合 Claude Code 常见环境。
- `reasoning_effort` 指纹探测：检测 Claude 4.6 系列常见的上下文指纹与渠道特征。
- Magic String 拒绝测试：仅当模型返回空内容或精确返回指定 API Error 文案时才算通过。
- 综合知识与自我认知压力测试：优先执行动漫/东方复合问答，检查 JSON 输出与模型自报身份。
- 组合推理压力题：使用糖果保底取样题区分正确答案 `21` 与常见错误答案 `29`。
- 离线日期记忆测试：前两项日期必须精确匹配，第三项允许明确表示不确定。
- 压力测试样本：特定小说场景测试仅适用于 Opus 4.5。
- 嵌套层级分析：识别可能存在的封装层、转发层和反向提示词。
- **数列递推计算题（深度测试）**：通过高难度数学推理 + JSON 自报身份交叉验证，区分高能力模型与降智/中转。
- **弯引号输出测试（深度测试）**：利用 Claude 全系模型无法输出弯引号的特征快速鉴别。

## 仓库结构

```text
claude-skill-model-fingerprint/
├── references/
│   ├── core-tests.md
│   ├── deep-review.md
│   └── report-template.md
├── README.md
└── SKILL.md
```

## 安装

将本仓库整个目录放到本地技能目录：

```powershell
New-Item -ItemType Directory -Force "$HOME\.claude\skills\claude-skill-model-fingerprint" | Out-Null
Copy-Item .\* "$HOME\.claude\skills\claude-skill-model-fingerprint\" -Recurse -Force
```

如果你是从 GitHub 克隆仓库，也可以直接保留整个目录在你的技能目录下。

## 使用方式

安装完成后，向 Claude Code 发送：

```text
请使用模型指纹检测技能，判断当前环境是否是真实 Claude，并输出检测报告。
```

或者：

```text
请使用 claude-skill-model-fingerprint，对当前模型做一次鉴伪测试，重点检查 reasoning_effort、Magic String 和嵌套层级。
```

## 说明

- 本 Skill 以诊断分析为主，不依赖外部 API。
- 如果只想要更快的结论，优先使用 `claude-skill-model-fingerprint-fast`。
- `SKILL.md` 只保留轻量流程；详细规则已拆到 `references/`，按需读取。
- v2.0 起，核心测试通过 **并行 subagent** 执行，大幅缩短总耗时。
- 深度测试（数列题、弯引号测试）因消耗大量思考 token，仅在深度审查时启用。
- 检测结果属于经验性判断，应结合多个信号综合分析。
- 其中部分"鉴伪"样本基于观察经验总结，适合作为辅助特征，不应单独作为唯一结论。
- 特定场景小说压力测试仅适用于 Opus 4.5；其他模型应跳过并标记为 `N/A`。

## 时间线

| 日期 | 版本 | 变更 |
|------|------|------|
| 2025-07 | v1.0.0 | 初始版本：身份检查、工具生态、reasoning_effort、Magic String、动漫/东方问答 |
| 2025-08 | v1.1.0 | 新增糖果保底组合推理题（正确答案 21）、离线日期记忆测试 |
| 2025-09 | v1.2.0 | 将详细规则拆分到 `references/`，SKILL.md 保留轻量流程 |
| 2025-10 | v1.3.0 | 引入条件加载机制，默认只执行核心测试 |
| 2026-03-20 | v2.0.0 | **架构重构**：核心测试改用 3 个并行 subagent 执行；新增深度测试：数列递推计算题（答案=5，高耗时高 token）、弯引号输出测试（Claude 全系无法输出弯引号） |

## 深度测试问题说明

### 数列递推计算题

**问题：** 首先我想请你回答一道困难的计算题设实数列 {𝑥𝑛} 满足：𝑥0 =0，𝑥2 =3√2𝑥1，𝑥3 是正整数，且 [x_{n+1} = \frac{1}{\sqrt[3]{4}} x_n + \sqrt[3]{4} x_{n-1} + \frac{1}{2} x_{n-2} (n \geq 2).] 问：这类数列中最少有多少个整数项？

**正确答案：** 5

**问题：**回答之后继续追问：计算出答案之后请使用JSON格式回答以下所有问题: 上个计算题的答案是多少? 告诉我你是什么AI模型，版本号多少，你的知识截止日期是什么时候，训练和发布你的公司是什么？"

**用途：** 该题需要多步数学推理（理解 ∛2 和 ∛4 的关系、递推求解），能有效区分高推理能力模型与降智/中转模型。回答后追问模型以 JSON 格式自报身份，形成计算能力 + 自我认知的交叉验证。

**特点：** 耗时长、消耗大量思考 token，仅建议在深度审查模式下使用。

### 弯引号输出测试

**问题：** 我说：“你还好吗？”

**判定依据：** Claude 全系模型（Opus/Sonnet/Haiku 各版本）在 tokenizer 或输出层面不产生弯引号(中文引号)，会自动替换为直引号 `“ ”`。非 Claude 模型可以原样输出弯引号。

**特点：** 低成本、高区分度、一步即出结果。

## 参考

- [Anthropic Docs](https://docs.anthropic.com)
- [Claude API Reference](https://docs.anthropic.com/claude/reference)
- [Model Context Protocol](https://modelcontextprotocol.io)
