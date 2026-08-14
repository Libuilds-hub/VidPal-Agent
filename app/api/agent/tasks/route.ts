// app/api/agent/tasks/route.ts —— Web → Runtime 任务代理（页面用）
import { NextRequest, NextResponse } from "next/server"
import { createRuntimeClient } from "@/lib/runtime-client"

const runtime = createRuntimeClient()

export const dynamic = "force-dynamic"

export async function GET() {
  try {
    const tasks = await runtime.listTasks()
    return NextResponse.json(tasks)
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Runtime 不可用" },
      { status: 502 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const result = await runtime.submitTask({
      type: String(body.type ?? "echo"),
      input: body.input ?? {},
      idempotencyKey: body.idempotencyKey,
    })
    return NextResponse.json(result)
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "提交失败" },
      { status: 502 }
    )
  }
}
