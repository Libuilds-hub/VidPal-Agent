---
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
