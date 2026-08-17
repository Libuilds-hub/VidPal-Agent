// runtime/skills/catalog.ts —— 内置精选技能目录（安装来源之一）

export interface CatalogSkill {
  name: string
  description: string
  version: string
  default: boolean
  /** 完整 SKILL.md 内容（含 frontmatter），安装时写入 skills/<name>/SKILL.md */
  content: string
}

const videoStudy = `---
name: video-study
description: 视频学习助手核心技能：搜索、导入、分析 B站/YouTube 视频并回答视频内容问题
version: 1.0.0
default: true
---

# 视频学习技能

## 行为规则
1. 用户未指定搜索平台时，同时搜索 B站 和 YouTube（search_videos）
2. 搜索到结果后列出视频让用户选择，不要自动导入
3. 用户问视频内容时，先用 get_video_context 获取概要，需要细节再用 search_transcripts
4. 导入视频前让用户确认要导入哪些视频；导入后明确告知"后台处理中，大约需要 3-8 分钟"
5. 回答问题时引用具体的视频标题和时间点
6. 如果 LLM API Key 未配置，引导用户去设置页配置
`

const webResearch = `---
name: web-research
description: 联网研究助手：搜索网页、抓取内容并给出带来源的摘要
version: 0.1.0
default: false
---

# 网络研究技能

## 行为规则
1. 用户提出研究问题时，先用 web_search 搜索关键词并综合多个来源
2. 需要细节时用 http_get 抓取原文，引用时注明 URL
3. 输出按"结论 → 证据 → 来源"组织，不确定的内容明确标注
`

const mindmap = `---
name: mindmap
description: 思维导图生成：把视频摘要或笔记整理成结构化导图
version: 0.1.0
default: false
---

# 思维导图技能

## 行为规则
1. 用户要求生成导图时，先确认输入来源（视频摘要 / 文本笔记）
2. 输出 Markdown 层级结构（# 主题 → ## 分支 → ### 叶子）
3. 保持每个叶子节点为单一概念，不超过 10 个字
`

const videoNotes = `---
name: video-notes
description: 视频笔记整理：从转写中提炼关键点、术语与待复习问题
version: 0.1.0
default: false
---

# 视频笔记技能

## 行为规则
1. 用 search_transcripts 定位关键片段，引用视频标题与时间点
2. 输出分三节：关键点 / 术语表 / 待复习问题
3. 术语表给出通俗解释，不照抄原文
`

export const SKILL_CATALOG: CatalogSkill[] = [
  { name: "video-study", description: "视频学习助手核心技能：搜索、导入、分析 B站/YouTube 视频并回答视频内容问题", version: "1.0.0", default: true, content: videoStudy },
  { name: "web-research", description: "联网研究助手：搜索网页、抓取内容并给出带来源的摘要", version: "0.1.0", default: false, content: webResearch },
  { name: "mindmap", description: "思维导图生成：把视频摘要或笔记整理成结构化导图", version: "0.1.0", default: false, content: mindmap },
  { name: "video-notes", description: "视频笔记整理：从转写中提炼关键点、术语与待复习问题", version: "0.1.0", default: false, content: videoNotes },
]
