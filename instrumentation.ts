/**
 * Next.js 服务启动钩子：自动恢复进程崩溃 / 服务器重启后遗留的中断任务
 * （如 status 停留在 downloading/transcribing 但进程已死亡的视频）。
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { recoverInterruptedVideos } = await import("./lib/video-recovery")
    // 后台执行，不阻塞服务就绪；内部单飞 + 幂等
    void recoverInterruptedVideos()
  }
}
