// runtime/recovery.ts —— 启动时把崩溃遗留的 running/interrupted 重置为 pending 重跑
import type { RuntimeDb } from "./db"

export function recoverInterruptedTasks(db: RuntimeDb): string[] {
  const now = Date.now()
  const rows = db
    .prepare("SELECT id FROM task WHERE status IN ('running', 'interrupted')")
    .all() as Array<{ id: string }>
  if (rows.length === 0) return []

  db.prepare(
    "UPDATE task SET status = 'pending', stage = 'init', updated_at = ? WHERE status IN ('running', 'interrupted')"
  ).run(now)

  console.log(`[runtime] 启动恢复：${rows.length} 个中断任务已重置为 pending`)
  return rows.map((r) => r.id)
}
