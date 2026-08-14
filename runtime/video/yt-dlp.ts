import { exec, type ExecOptions } from "child_process"
import { promisify } from "util"
import path from "path"
import fs from "fs"
import { existsSync, mkdirSync, writeFileSync, unlinkSync, renameSync } from "fs"
import { prisma } from "../../lib/db"

const execAsync = promisify(exec)

// 支持 AbortSignal 的 exec 封装（取消任务时终止子进程）
function execWithSignal(
  command: string,
  signal: AbortSignal | undefined,
  options: ExecOptions = {}
): Promise<{ stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    const child = exec(command, { ...options, signal }, (err, stdout, stderr) => {
      if (err) {
        if (signal?.aborted) {
          reject(new Error("任务已取消"))
        } else {
          reject(err)
        }
        return
      }
      resolve({ stdout: stdout.toString(), stderr: stderr.toString() })
    })
    void child
  })
}

// ffmpeg 转码进度会持续写入 stderr，长视频转码可能超过 Node exec 默认 1MB 缓冲，
// 一旦超限 Node 会杀掉 cmd.exe 子进程，导致转码中断且留下不完整文件。
// 这里统一放宽缓冲上限。
const EXEC_MAX_BUFFER = 128 * 1024 * 1024

const VIDEOS_DIR = path.join(process.cwd(), "public", "videos")
const COOKIES_FILE = path.join(process.cwd(), "cookies.txt")
const FFMPEG_PATH = "D:\\python3.10\\Scripts\\ffmpeg.exe"

const BILIBILI_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36"

// 获取视频资源目录
export function getVideoDir(videoId: string): string {
  return path.join(VIDEOS_DIR, videoId)
}

// 确保视频资源目录存在
export async function ensureVideoDir(videoId: string): Promise<string> {
  const videoDir = getVideoDir(videoId)
  if (!existsSync(videoDir)) {
    mkdirSync(videoDir, { recursive: true })
  }
  return videoDir
}

export interface VideoInfo {
  id: string
  title: string | null
  duration: number | null
  thumbnail: string | null
  extractor: string
}

// 设置 Bilibili Cookie（将原始 Cookie 字符串转换为 Netscape 格式写入）
export function setBilibiliCookie(cookie: string): void {
  writeFileSync(COOKIES_FILE, rawCookiesToNetscape(cookie), "utf-8")
}

// 清除 Cookie
export function clearCookie(): void {
  if (existsSync(COOKIES_FILE)) {
    unlinkSync(COOKIES_FILE)
  }
}

// 获取 Cookie 参数
function getCookieArg(): string {
  return existsSync(COOKIES_FILE) ? `--cookies "${COOKIES_FILE}"` : ""
}

// 将浏览器导出的原始 Cookie 字符串（如 "SESSDATA=xxx; bili_jct=xxx; ..."）转换为 Netscape 格式
function rawCookiesToNetscape(raw: string): string {
  const lines = ["# Netscape HTTP Cookie File"]
  // 兼容开头带 "Cookie:" 前缀的粘贴内容
  const cleaned = raw.replace(/^Cookie:\s*/i, "")
  for (const part of cleaned.split(";")) {
    const idx = part.indexOf("=")
    if (idx <= 0) continue
    const name = part.slice(0, idx).trim()
    const value = part.slice(idx + 1).trim()
    if (!name || !value) continue
    // 统一按 .bilibili.com 域写入；SESSDATA 等 HttpOnly Cookie 需要 HttpOnly 标记
    lines.push(`#HttpOnly_.bilibili.com\tTRUE\t/\tTRUE\t2147483647\t${name}\t${value}`)
  }
  return lines.join("\n")
}

// 从数据库同步 Bilibili Cookie 到 cookies.txt（仅当设置中存在时写入）
async function syncBilibiliCookie(): Promise<void> {
  try {
    const setting = await prisma.setting.findUnique({
      where: { key: "bilibiliCookie" },
    })
    const raw = setting?.value?.trim()
    if (raw) {
      writeFileSync(COOKIES_FILE, rawCookiesToNetscape(raw), "utf-8")
    }
  } catch (err) {
    console.error("Failed to sync bilibili cookie:", err)
  }
}

export async function ensureVideosDir(): Promise<void> {
  if (!existsSync(VIDEOS_DIR)) {
    mkdirSync(VIDEOS_DIR, { recursive: true })
  }
}

export async function downloadThumbnail(
  thumbnailUrl: string,
  videoId: string
): Promise<string | null> {
  if (!thumbnailUrl) return null

  const videoDir = await ensureVideoDir(videoId)

  const ext = thumbnailUrl.split(".").pop()?.split("?")[0] || "jpg"
  const outputPath = path.join(videoDir, `cover.${ext}`)
  const command = `curl -L -o "${outputPath}" "${thumbnailUrl}"`

  try {
    await execAsync(command)
    return `/videos/${videoId}/cover.${ext}`
  } catch (error) {
    console.error("Failed to download thumbnail:", error)
    return null
  }
}

export async function getVideoInfo(url: string): Promise<VideoInfo> {
  // B站视频需先同步登录 Cookie（否则可能被风控 412 拦截）
  if (url.includes("bilibili.com")) {
    await syncBilibiliCookie()
  }
  const cookieArg = getCookieArg()
  const extraArgs = url.includes("bilibili.com") ? `--user-agent "${BILIBILI_UA}" ` : ""
  const command = `yt-dlp --dump-json --no-download --no-warnings -f "bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best" ${extraArgs}${cookieArg} "${url}"`

  try {
    const { stdout, stderr } = await execAsync(command, { encoding: "utf-8" })

    // yt-dlp outputs errors to stderr, check for errors first
    if (stderr && stderr.includes("ERROR")) {
      throw new Error(stderr.trim())
    }

    // Ensure we have valid JSON output
    if (!stdout || !stdout.trim()) {
      throw new Error("No output from yt-dlp")
    }

    const data = JSON.parse(stdout)

    return {
      id: data.id,
      title: data.title || null,
      duration: data.duration ? Math.floor(data.duration) : null,
      thumbnail: data.thumbnail || null,
      extractor: data.extractor,
    }
  } catch (error) {
    console.error("Failed to get video info:", error)
    // Re-throw with user-friendly message
    if (error instanceof Error) {
      if (error.message.includes("HTTP Error 412") || error.message.includes("Precondition Failed")) {
        throw new Error(
          "B站风控拦截（HTTP 412）。请到 设置 → Cookie 配置 填入已登录 bilibili.com 的浏览器 Cookie（需包含 SESSDATA），保存后重新导入；或更换网络环境后重试。"
        )
      }
      if (error.message.includes("HTTP Error 403") || error.message.includes("Forbidden")) {
        throw new Error("B站视频需要登录Cookie才能下载。请先设置Cookie。")
      }
      if (error.message.includes("HTTP Error 404") || error.message.includes("Not Found")) {
        throw new Error("视频不存在或链接无效")
      }
      throw error
    }
    throw new Error("Failed to fetch video information")
  }
}

// 判断 mp4 文件是否完整（moov atom 存在于文件头或文件尾）
// 被中断的转码文件缺少 moov atom，无法正常播放
export function isMp4Complete(filePath: string): boolean {
  try {
    const fd = fs.openSync(filePath, "r")
    try {
      const size = fs.fstatSync(fd).size
      const headSize = Math.min(size, 1024 * 1024)
      const tailSize = Math.min(size, 1024 * 1024)
      const head = Buffer.alloc(headSize)
      fs.readSync(fd, head, 0, headSize, 0)
      const tail = Buffer.alloc(tailSize)
      fs.readSync(fd, tail, 0, tailSize, size - tailSize)
      return head.includes(Buffer.from("moov")) || tail.includes(Buffer.from("moov"))
    } finally {
      fs.closeSync(fd)
    }
  } catch {
    return false
  }
}

// 转码为 H.264（因为 HEVC 在很多浏览器不支持）
// -y 覆盖不完整的旧输出；veryfast 预设对 4K60 AV1 源显著提速，画质对转写场景足够
async function transcodeToH264(inputPath: string, outputPath: string): Promise<void> {
  const command = `"${FFMPEG_PATH}" -y -i "${inputPath}" -c:v libx264 -preset veryfast -crf 23 -c:a aac -strict experimental "${outputPath}"`

  try {
    await execAsync(command, { encoding: "utf-8", maxBuffer: EXEC_MAX_BUFFER })
  } catch (error) {
    console.error("Transcode failed:", error)
    throw error
  }
}

/**
 * 本地恢复被中断的下载（不联网）：
 * 1. video.mp4 已完整 → 直接返回
 * 2. original.mp4 完整 → 重新转码生成 video.mp4 并删除 original.mp4
 * 3. 两者都不可用 → 抛错（由调用方标记为 error）
 */
export async function recoverVideoFile(videoId: string): Promise<string> {
  const videoDir = await ensureVideoDir(videoId)
  const videoPath = path.join(videoDir, "video.mp4")
  const originalPath = path.join(videoDir, "original.mp4")

  if (existsSync(videoPath) && isMp4Complete(videoPath)) {
    console.log(`[recover] ${videoId}: video.mp4 已完整，无需重新转码`)
    return `/videos/${videoId}/video.mp4`
  }

  if (existsSync(originalPath) && isMp4Complete(originalPath)) {
    console.log(`[recover] ${videoId}: video.mp4 不完整，从 original.mp4 重新转码...`)
    await transcodeToH264(originalPath, videoPath)
    unlinkSync(originalPath)
    console.log(`[recover] ${videoId}: 转码完成`)
    return `/videos/${videoId}/video.mp4`
  }

  throw new Error(
    `本地文件缺失或损坏（video.mp4 / original.mp4 均不可用），请删除该视频后重新导入`
  )
}

export async function downloadVideo(
  url: string,
  videoId: string,
  onProgress?: (progress: number) => void
): Promise<string> {
  const videoDir = await ensureVideoDir(videoId)

  // B站视频需先同步登录 Cookie
  if (url.includes("bilibili.com")) {
    await syncBilibiliCookie()
  }
  const tempPath = path.join(videoDir, "original.mp4")
  const outputPath = path.join(videoDir, "video.mp4")
  const cookieArg = getCookieArg()
  const extraArgs = url.includes("bilibili.com") ? `--user-agent "${BILIBILI_UA}" ` : ""
  const command = `yt-dlp -f "bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best" -o "${tempPath}" --no-warnings ${extraArgs}${cookieArg} "${url}"`

  try {
    await execAsync(command, { encoding: "utf-8", maxBuffer: EXEC_MAX_BUFFER })

    // 转码为 H.264（兼容浏览器）
    await transcodeToH264(tempPath, outputPath)

    // 删除临时文件
    unlinkSync(tempPath)

    return `/videos/${videoId}/video.mp4`
  } catch (error) {
    console.error("Download failed:", error)
    // 如果转码失败，尝试直接使用原文件
    if (existsSync(tempPath)) {
      // 输出路径可能存在不完整的 video.mp4，需先删除再重命名（Windows 不允许覆盖重命名）
      if (existsSync(outputPath)) {
        unlinkSync(outputPath)
      }
      renameSync(tempPath, outputPath)
      return `/videos/${videoId}/video.mp4`
    }
    throw new Error("Failed to download video")
  }
}

export async function downloadAudio(
  url: string,
  videoId: string
): Promise<string> {
  const videoDir = await ensureVideoDir(videoId)

  // B站视频需先同步登录 Cookie
  if (url.includes("bilibili.com")) {
    await syncBilibiliCookie()
  }
  const outputPath = path.join(videoDir, "audio.mp3")
  const cookieArg = getCookieArg()
  const extraArgs = url.includes("bilibili.com") ? `--user-agent "${BILIBILI_UA}" ` : ""
  const command = `yt-dlp -x --audio-format mp3 --audio-quality 0 -o "${outputPath}" --no-warnings ${extraArgs}${cookieArg} "${url}"`

  try {
    await execAsync(command, { encoding: "utf-8" })
    return `/videos/${videoId}/audio.mp3`
  } catch (error) {
    console.error("Audio download failed:", error)
    throw new Error("Failed to download audio")
  }
}
