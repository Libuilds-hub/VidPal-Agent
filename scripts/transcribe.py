
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
    model = WhisperModel(model_size, device="cpu", compute_type="int8")

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
