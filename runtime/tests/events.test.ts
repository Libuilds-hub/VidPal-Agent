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

test("监听器抛错不影响其他监听器，emit 不抛错", () => {
  const db = createRuntimeDb(":memory:")
  const bus = new TaskEventBus(db)

  const received: string[] = []
  bus.on("t1", () => {
    throw new Error("listener boom")
  })
  bus.on("t1", (ev) => received.push(ev.type))

  const origError = console.error
  const logged: unknown[][] = []
  console.error = (...args: unknown[]) => {
    logged.push(args)
  }
  try {
    // 第一个监听器抛错，emit 不得向上抛出
    assert.doesNotThrow(() => bus.emit("t1", "stage", { stage: "prepare" }))
  } finally {
    console.error = origError
  }

  // 第二个监听器仍然收到事件
  assert.deepEqual(received, ["stage"])
  // 异常被 console.error 记录（含监听器/事件上下文）
  assert.equal(logged.length, 1)
  const logText = logged[0].map((a) => String(a)).join(" ")
  assert.match(logText, /t1/)
  assert.match(logText, /listener boom/)

  db.close()
})

test("退订后不再收到事件，重新订阅可用", () => {
  const db = createRuntimeDb(":memory:")
  const bus = new TaskEventBus(db)

  const received: string[] = []
  const unsubscribe = bus.on("t1", (ev) => received.push(ev.type))

  bus.emit("t1", "log", { message: "a" })
  assert.deepEqual(received, ["log"])

  // 退订后不再收到
  unsubscribe()
  bus.emit("t1", "log", { message: "b" })
  assert.deepEqual(received, ["log"])

  // 重新订阅可用
  const unsubscribe2 = bus.on("t1", (ev) => received.push(ev.type))
  bus.emit("t1", "log", { message: "c" })
  assert.deepEqual(received, ["log", "log"])
  unsubscribe2()

  db.close()
})

test("subscribeFrom 先回放再实时，无缺口", () => {
  const db = createRuntimeDb(":memory:")
  const bus = new TaskEventBus(db)

  // 订阅前已落库的事件
  bus.emit("t1", "stage", { stage: "prepare" }) // seq 1
  bus.emit("t1", "log", { message: "hello" }) // seq 2

  const replayed: number[] = []
  const live: number[] = []
  const unsubscribe = bus.subscribeFrom("t1", 1, (ev) => {
    if (ev.seq <= 2) replayed.push(ev.seq)
    else live.push(ev.seq)
  })

  // 订阅后新事件走实时路径
  bus.emit("t1", "log", { message: "live" }) // seq 3

  // afterSeq=1：只回放 seq 2（订阅前已存在的事件）
  assert.deepEqual(replayed, [2])
  // seq 3 是订阅后才发出的事件，走实时监听
  assert.deepEqual(live, [3])

  // 退订后实时监听停止（回放是一次性的）
  unsubscribe()
  bus.emit("t1", "log", { message: "after-unsub" }) // seq 4
  assert.deepEqual(replayed, [2])
  assert.deepEqual(live, [3])

  db.close()
})

test("subscribeFrom afterSeq=0 回放全部历史事件", () => {
  const db = createRuntimeDb(":memory:")
  const bus = new TaskEventBus(db)

  bus.emit("t1", "stage", { stage: "prepare" }) // seq 1
  bus.emit("t1", "log", { message: "hello" }) // seq 2

  const seqs: number[] = []
  const unsubscribe = bus.subscribeFrom("t1", 0, (ev) => seqs.push(ev.seq))

  // 全部历史事件经回放路径送达，seq 递增有序
  assert.deepEqual(seqs, [1, 2])
  unsubscribe()

  db.close()
})
