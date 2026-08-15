import { exec } from "child_process"
import { promisify } from "util"
import path from "path"
import fs from "fs"
import { existsSync } from "fs"
import { execWithSignal } from "./exec"

const execAsync = promisify(exec)

// 放宽 exec 输出缓冲上限（ffmpeg 进度写入 stderr，长音频提取可能超过默认 1MB）
const EXEC_MAX_BUFFER = 128 * 1024 * 1024

const VIDEOS_DIR = path.join(process.cwd(), "public", "videos")
const PYTHON_SCRIPT = path.join(process.cwd(), "scripts", "transcribe.py")

export interface TranscriptSegment {
  start: number
  end: number
  text: string
}

export interface FormattedTranscript {
  start: string
  startTime: number
  end: string
  text: string
}

// Ensure scripts directory exists
function ensureScriptsDir(): void {
  const scriptsDir = path.join(process.cwd(), "scripts")
  if (!existsSync(scriptsDir)) {
    fs.mkdirSync(scriptsDir, { recursive: true })
  }
}

// Create Python transcription script
function createTranscribeScript(): void {
  ensureScriptsDir()

  const script = `
import sys
import json
import os

try:
    from faster_whisper import WhisperModel
    import opencc

    audio_path = sys.argv[1]
    model_size = sys.argv[2] if len(sys.argv) > 2 else "base"
    language = sys.argv[3] if len(sys.argv) > 3 else "zh"

    print(f"Loading Whisper {model_size} model...", file=sys.stderr)

    model = None
    # Try online first, fall back to offline cache on network error
    for offline in (False, True):
        try:
            if offline:
                os.environ["HF_HUB_OFFLINE"] = "1"
                print("Retrying with offline cache...", file=sys.stderr)
            model = WhisperModel(model_size, device="cpu", compute_type="int8")
            break
        except Exception as e:
            if not offline:
                print(f"Online load failed: {e}", file=sys.stderr)
            else:
                raise

    if model is None:
        raise RuntimeError("Failed to load Whisper model")

    print(f"Transcribing: {audio_path}", file=sys.stderr)
    segments, info = model.transcribe(
        audio_path,
        language=language,
        word_timestamps=True
    )

    print(f"Detected language: {info.language}", file=sys.stderr)

    # 初始化 OpenCC繁简转换器（繁体→简体）
    converter = opencc.OpenCC('t2s')

    results = []
    for segment in segments:
        # 将转录文本从繁体转换为简体
        simplified_text = converter.convert(segment.text.strip())
        results.append({
            "start": segment.start,
            "end": segment.end,
            "text": simplified_text
        })

    print(json.dumps(results))

except Exception as e:
    print(f"Error: {str(e)}", file=sys.stderr)
    sys.exit(1)
`

  fs.writeFileSync(PYTHON_SCRIPT, script, "utf-8")
}

function formatTimestamp(seconds: number): string {
  const minutes = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
}

/**
 * 已知限制：transcribe 阶段（python whisper 进程）不支持子进程级取消——这里用
 * execAsync（无 AbortSignal），取消只在阶段边界生效：任务在 transcribe 完成后经
 * 下一阶段的 ctx.checkCancelled() 才落 cancelled，取消请求到生效之间 python 进程
 * 会继续跑完。如需子进程级中断，需把 python 改为经 execWithSignal 启动并透传信号
 * （对比：extractAudio 的 ffmpeg 已走 execWithSignal，支持即时中断）。
 */
export async function transcribeAudio(
  audioPath: string,
  modelSize: string = "base",
  language: string = "zh"
): Promise<FormattedTranscript[]> {
  // Create Python script if not exists
  if (!existsSync(PYTHON_SCRIPT)) {
    createTranscribeScript()
  }

  const command = `python "${PYTHON_SCRIPT}" "${audioPath}" "${modelSize}" "${language}"`

  try {
    const { stdout, stderr } = await execAsync(command, { encoding: "utf-8", maxBuffer: EXEC_MAX_BUFFER })

    // stderr contains progress messages
    if (stderr) {
      console.log("Transcription:", stderr.trim())
    }

    const segments = JSON.parse(stdout)

    return segments.map((seg: TranscriptSegment) => ({
      start: formatTimestamp(seg.start),
      startTime: seg.start,
      end: formatTimestamp(seg.end),
      text: seg.text
    }))

  } catch (error) {
    console.error("Transcription failed:", error)
    throw new Error("Failed to transcribe audio")
  }
}

export async function extractAudio(
  videoPath: string,
  outputPath: string,
  signal?: AbortSignal
): Promise<void> {
  const command = `ffmpeg -i "${videoPath}" -vn -acodec mp3 -ar 16000 -ac 1 "${outputPath}" -y`

  try {
    await execWithSignal(command, signal, { maxBuffer: EXEC_MAX_BUFFER })
  } catch (error) {
    console.error("Audio extraction failed:", error)
    throw new Error("Failed to extract audio from video")
  }
}