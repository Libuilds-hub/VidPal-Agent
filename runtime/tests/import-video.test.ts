// runtime/tests/import-video.test.ts
import { test } from "node:test"
import assert from "node:assert/strict"
import { planStages, type StageName } from "../video/import-video"

interface VideoLike {
  title: string | null
  localPath: string | null
  transcripts: string | null
  summary: string | null
  mindmap: string | null
}

test("planStages：全新网络视频 → info/download/transcribe/summarize", () => {
  const video: VideoLike = { title: null, localPath: null, transcripts: null, summary: null, mindmap: null }
  const files = { originalMp4: false, videoMp4: false }
  const stages = planStages({ video, files, isLocalUpload: false })
  // download 阶段 = yt-dlp 下载 + 转码（一步到位产出 video.mp4），无需单独 transcode
  assert.deepEqual(stages, ["info", "download", "transcribe", "summarize"])
})

test("planStages：转码完成但未转录 → 跳过前两阶段", () => {
  const video: VideoLike = { title: "t", localPath: "/videos/x/video.mp4", transcripts: null, summary: null, mindmap: null }
  const files = { originalMp4: true, videoMp4: true }
  const stages = planStages({ video, files, isLocalUpload: false })
  assert.deepEqual(stages, ["transcribe", "summarize"])
})

test("planStages：只有 original.mp4（崩溃遗留）→ transcode 待做", () => {
  const video: VideoLike = { title: "t", localPath: null, transcripts: null, summary: null, mindmap: null }
  const files = { originalMp4: true, videoMp4: false }
  const stages = planStages({ video, files, isLocalUpload: false })
  // transcode = 从 original.mp4 恢复转码（recoverVideoFile）
  assert.deepEqual(stages, ["transcode", "transcribe", "summarize"])
})

test("planStages：摘要导图齐全 → 空（已完成）", () => {
  const video: VideoLike = { title: "t", localPath: "/videos/x/video.mp4", transcripts: "[]", summary: "{}", mindmap: "{}" }
  const files = { originalMp4: false, videoMp4: true }
  assert.deepEqual(planStages({ video, files, isLocalUpload: false }), [])
})

test("planStages：本地上传 → 无下载/转码阶段", () => {
  const video: VideoLike = { title: "本地.mp4", localPath: "/uploads/x.mp4", transcripts: null, summary: null, mindmap: null }
  const files = { originalMp4: false, videoMp4: false }
  const stages = planStages({ video, files, isLocalUpload: true })
  assert.deepEqual(stages, ["transcribe", "summarize"])
})

test("StageName 集合完整", () => {
  const all: StageName[] = ["info", "download", "transcode", "transcribe", "summarize"]
  assert.equal(all.length, 5)
})
