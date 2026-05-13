import { exec } from "child_process"
import { promisify } from "util"
import path from "path"
import fs from "fs"
import { existsSync } from "fs"

const execAsync = promisify(exec)

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

    audio_path = sys.argv[1]
    model_size = sys.argv[2] if len(sys.argv) > 2 else "base"
    language = sys.argv[3] if len(sys.argv) > 3 else "zh"

    print(f"Loading Whisper {model_size} model...", file=sys.stderr)
    model = WhisperModel(model_size, device="cpu", compute_type="int8")

    print(f"Transcribing: {audio_path}", file=sys.stderr)
    segments, info = model.transcribe(
        audio_path,
        language=language,
        word_timestamps=True
    )

    print(f"Detected language: {info.language}", file=sys.stderr)

    results = []
    for segment in segments:
        results.append({
            "start": segment.start,
            "end": segment.end,
            "text": segment.text.strip()
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
    const { stdout, stderr } = await execAsync(command, { encoding: "utf-8" })

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

export async function extractAudio(videoPath: string, outputPath: string): Promise<void> {
  const command = `ffmpeg -i "${videoPath}" -vn -acodec mp3 -ar 16000 -ac 1 "${outputPath}" -y`

  try {
    await execAsync(command)
  } catch (error) {
    console.error("Audio extraction failed:", error)
    throw new Error("Failed to extract audio from video")
  }
}