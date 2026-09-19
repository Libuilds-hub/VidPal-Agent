# 界面素材

这里放的是 README 里引用的界面截图与演示视频。内容都是在本地跑起 `npm run dev:all` 之后，
用真实数据（已导入并转写的视频）实际截取 / 录制的，没有做设计稿替换。

```
screenshots/                 12 张页面截图，1440×900
demo/
  vidpal-agent-demo.gif      16 秒核心流程循环（README 首屏内联播放）
  vidpal-agent-demo.mp4      37 秒完整演示，1440×900 / H.264
  poster.jpg                 封面帧
```

## 怎么重新生成

先启动 Web 与 Runtime：

```bash
npm run dev:all
```

再用 Playwright 抓图和录屏（需要本机已有浏览器环境）：

```bash
# 截图：打开 http://127.0.0.1:3000/xxx 后截图
playwright-cli open http://127.0.0.1:3000/dashboard
playwright-cli resize 1440 900
playwright-cli screenshot

# 录屏：video-start / video-stop 之间正常操作系统，产出 webm
playwright-cli video-start demo-raw.webm
playwright-cli video-stop
```

然后把 webm 剪成 mp4 / gif（去掉加载白屏、只保留有内容的片段）：

```bash
# 精炼 mp4：按片段 trim 后 concat
ffmpeg -i demo-raw.webm -filter_complex "[0:v]trim=start=3:end=9,setpts=PTS-STARTPTS[a];[0:v]trim=start=11:end=14.5,setpts=PTS-STARTPTS[b];[a][b]concat=n=2:v=1:a=0[out]" \
  -map "[out]" -c:v libx264 -preset slow -crf 24 -pix_fmt yuv420p -movflags +faststart demo.mp4

# 循环 gif：缩到 1000px 宽并生成调色板，否则文件会非常大
ffmpeg -i demo-raw.webm -filter_complex "[...]fps=12,scale=1000:-1:flags=lanczos,split[a][b];[a]palettegen=max_colors=160:stats_mode=diff[p];[b][p]paletteuse=dither=sierra2_4a:diff_mode=rectangle[out]" \
  -map "[out]" -loop 0 demo.gif
```

注意：截图里不要出现 API Key、Cookie 等明文凭证（设置页默认已脱敏）。
