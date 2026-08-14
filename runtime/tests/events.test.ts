// runtime/tests/events.test.ts
import { test } from "node:test"
import assert from "node:assert/strict"
import { createRuntimeDb } from "../db"
import { TaskEventBus } from "../events"

test("事件先落库再通知订阅者", async () => {
  const db = createRuntimeDb(":memory:")
  const bus = new TaskEventBus(db)

  const received: string[] = []
  bus.on("t1", (ev) => received.push(ev.type))

  bus.emit("t1", "stage", { stage: "prepare" })
  bus.emit("t1", "log", { message: "hello" })
  bus.emit("t1", "task_done", { result: "ok" })

  // 订阅者实时收到
  assert.deepEqual(received, ["stage", "log", "task_done"])

  // 事件已持久化，seq 递增
  const rows = db
    .prepare("SELECT seq, type FROM task_event WHERE task_id = ? ORDER BY seq")
    .all("t1") as Array<{ seq: number; type: string }>
  assert.deepEqual(rows.map((r) => r.type), ["stage", "log", "task_done"])
  assert.deepEqual(rows.map((r) => r.seq), [1, 2, 3])

  // 回放：afterSeq=1 只返回 seq 2、3
  const replay = bus.replay("t1", 1)
  assert.equal(replay.length, 2)
  assert.equal(replay[0].seq, 2)
  assert.equal(replay[1].type, "task_done")

  db.close()
})

test("lastSeq 返回最新序列号", () => {
  const db = createRuntimeDb(":memory:")
  const bus = new TaskEventBus(db)
  bus.emit("t1", "log", {})
  bus.emit("t1", "log", {})
  assert.equal(bus.lastSeq("t1"), 2)
  db.close()
})
