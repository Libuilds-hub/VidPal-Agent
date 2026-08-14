// runtime/tests/import-video.test.ts
import { test } from "node:test"
import assert from "node:assert/strict"
import path from "node:path"
import os from "node:os"
import fs from "node:fs"
import { planStages, ensureLocalSource, type StageName } from "../video/import-video"

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

// ---- ensureLocalSource（Fix 1：本地上传源文件就位）----
// 模拟 public/uploads（上传落盘区）与 public/videos/<id>（视频目录），
// 临时 chdir 到临时根目录（ensureLocalSource 以 process.cwd()/public 为基准解析 localPath）
function withTempLocalSource(
  work: (ctx: { videoDir: string; sourcePath: string; sourceContent: string; localPath: string }) => void
): void {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "ensure-local-src-"))
  const uploadsDir = path.join(root, "public", "uploads")
  const videoDir = path.join(root, "public", "videos", "v1")
  fs.mkdirSync(uploadsDir, { recursive: true })
  fs.mkdirSync(videoDir, { recursive: true })
  const sourceContent = "hello local upload source"
  const sourcePath = path.join(uploadsDir, "abc123.mp4")
  fs.writeFileSync(sourcePath, sourceContent, "utf-8")
  const prevCwd = process.cwd()
  process.chdir(root)
  try {
    work({ videoDir, sourcePath, sourceContent, localPath: "/uploads/abc123.mp4" })
  } finally {
    process.chdir(prevCwd)
    fs.rmSync(root, { recursive: true, force: true })
  }
}

test("ensureLocalSource：本地上传文件复制到视频目录并返回 target 路径", () => {
  withTempLocalSource(({ videoDir, sourceContent, localPath }) => {
    const target = ensureLocalSource(videoDir, localPath)
    assert.equal(target, path.join(videoDir, "video.mp4"))
    assert.equal(fs.existsSync(target), true)
    assert.equal(fs.readFileSync(target, "utf-8"), sourceContent)
  })
})

test("ensureLocalSource：video.mp4 已完整则不再复制（幂等）", () => {
  withTempLocalSource(({ videoDir, localPath }) => {
    const target = path.join(videoDir, "video.mp4")
    // 用含 moov 标记的文件模拟已完整转码的 mp4（isMp4Complete 扫描头/尾 1MB 找 moov）
    fs.writeFileSync(target, "moov-fake-complete-video")
    const result = ensureLocalSource(videoDir, localPath)
    assert.equal(result, target)
    assert.equal(fs.readFileSync(target, "utf-8"), "moov-fake-complete-video") // 未被覆盖
  })
})

test("ensureLocalSource：上传源文件缺失 → 抛「上传文件不存在」", () => {
  withTempLocalSource(({ videoDir }) => {
    assert.throws(() => ensureLocalSource(videoDir, "/uploads/not-exist.mp4"), /上传文件不存在/)
  })
})

test("ensureLocalSource：localPath 为空 → 直接返回 target 不落盘", () => {
  withTempLocalSource(({ videoDir }) => {
    const target = ensureLocalSource(videoDir, undefined)
    assert.equal(target, path.join(videoDir, "video.mp4"))
    assert.equal(fs.existsSync(target), false)
  })
})
