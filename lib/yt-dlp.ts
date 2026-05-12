import { exec } from "child_process"
import { promisify } from "util"
import path from "path"
import fs from "fs"
import { existsSync, mkdirSync } from "fs"

const execAsync = promisify(exec)

const VIDEOS_DIR = path.join(process.cwd(), "public", "videos")

export interface VideoInfo {
  id: string
  title: string | null
  duration: number | null
  thumbnail: string | null
  extractor: string
}

export async function ensureVideosDir(): Promise<void> {
  if (!existsSync(VIDEOS_DIR)) {
    mkdirSync(VIDEOS_DIR, { recursive: true })
  }
}

export async function getVideoInfo(url: string): Promise<VideoInfo> {
  const command = `yt-dlp --dump-json --no-download --no-warnings -f "bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best" "${url}"`

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

export async function downloadVideo(
  url: string,
  videoId: string,
  onProgress?: (progress: number) => void
): Promise<string> {
  await ensureVideosDir()

  const outputPath = path.join(VIDEOS_DIR, `${videoId}.mp4`)
  const command = `yt-dlp -f "bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best" -o "${outputPath}" --no-warnings "${url}"`

  try {
    await execAsync(command, { encoding: "utf-8" })
    return `/videos/${videoId}.mp4`
  } catch (error) {
    console.error("Download failed:", error)
    throw new Error("Failed to download video")
  }
}

export async function downloadAudio(
  url: string,
  videoId: string
): Promise<string> {
  await ensureVideosDir()

  const outputPath = path.join(VIDEOS_DIR, `${videoId}.mp3`)
  const command = `yt-dlp -x --audio-format mp3 --audio-quality 0 -o "${outputPath}" --no-warnings "${url}"`

  try {
    await execAsync(command, { encoding: "utf-8" })
    return `/videos/${videoId}.mp3`
  } catch (error) {
    console.error("Audio download failed:", error)
    throw new Error("Failed to download audio")
  }
}
