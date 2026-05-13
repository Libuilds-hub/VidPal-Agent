import { exec } from "child_process"
import { promisify } from "util"
import path from "path"
import fs from "fs"
import { existsSync, mkdirSync, writeFileSync, unlinkSync, renameSync } from "fs"

const execAsync = promisify(exec)

const VIDEOS_DIR = path.join(process.cwd(), "public", "videos")
const COOKIES_FILE = path.join(process.cwd(), "cookies.txt")
const FFMPEG_PATH = "D:\\python3.10\\Scripts\\ffmpeg.exe"

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

// 设置 Bilibili Cookie（从环境变量或直接设置）
export function setBilibiliCookie(cookie: string): void {
  writeFileSync(COOKIES_FILE, cookie, "utf-8")
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
  const cookieArg = getCookieArg()
  const command = `yt-dlp --dump-json --no-download --no-warnings -f "bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best" ${cookieArg} "${url}"`

  try {
    const { stdout } = await execAsync(command, { encoding: "utf-8" })
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
    throw new Error("Failed to fetch video information")
  }
}

// 转码为 H.264（因为 HEVC 在很多浏览器不支持）
async function transcodeToH264(inputPath: string, outputPath: string): Promise<void> {
  const command = `"${FFMPEG_PATH}" -i "${inputPath}" -c:v libx264 -c:a aac -strict experimental "${outputPath}"`

  try {
    await execAsync(command)
  } catch (error) {
    console.error("Transcode failed:", error)
    throw error
  }
}

export async function downloadVideo(
  url: string,
  videoId: string,
  onProgress?: (progress: number) => void
): Promise<string> {
  const videoDir = await ensureVideoDir(videoId)

  const tempPath = path.join(videoDir, "original.mp4")
  const outputPath = path.join(videoDir, "video.mp4")
  const cookieArg = getCookieArg()
  const command = `yt-dlp -f "bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best" -o "${tempPath}" --no-warnings ${cookieArg} "${url}"`

  try {
    await execAsync(command, { encoding: "utf-8" })

    // 转码为 H.264（兼容浏览器）
    await transcodeToH264(tempPath, outputPath)

    // 删除临时文件
    unlinkSync(tempPath)

    return `/videos/${videoId}/video.mp4`
  } catch (error) {
    console.error("Download failed:", error)
    // 如果转码失败，尝试直接使用原文件
    if (existsSync(tempPath)) {
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

  const outputPath = path.join(videoDir, "audio.mp3")
  const cookieArg = getCookieArg()
  const command = `yt-dlp -x --audio-format mp3 --audio-quality 0 -o "${outputPath}" --no-warnings ${cookieArg} "${url}"`

  try {
    await execAsync(command, { encoding: "utf-8" })
    return `/videos/${videoId}/audio.mp3`
  } catch (error) {
    console.error("Audio download failed:", error)
    throw new Error("Failed to download audio")
  }
}
