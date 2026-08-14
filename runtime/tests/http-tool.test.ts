// runtime/tests/http-tool.test.ts
import { test } from "node:test"
import assert from "node:assert/strict"
import http from "node:http"
import type { AddressInfo } from "node:net"
import { createHttpTool, isPrivateHost } from "../tools/http-tool"
import { ToolRegistry } from "../tools/registry"

function startServer(handler: http.RequestListener) {
  const server = http.createServer(handler)
  server.listen(0)
  const port = (server.address() as AddressInfo).port
  return { server, base: `http://127.0.0.1:${port}` }
}

function stopServer(server: http.Server): Promise<void> {
  server.closeAllConnections()
  return new Promise((resolve) => server.close(() => resolve()))
}

function startEchoServer() {
  return startServer((_req, res) => {
    res.writeHead(200, { "Content-Type": "text/plain" })
    res.end("pong")
  })
}

test("http_get：正常请求与大小上限", async () => {
  const { server, base } = startEchoServer()
  try {
    const tool = createHttpTool()
    const r = await tool.execute({ url: `${base}/x`, allowPrivate: true })
    assert.equal(r.summary, "pong")

    await assert.rejects(() => tool.execute({ url: "ftp://example.com/x", allowPrivate: false }), /仅支持 http/)
  } finally {
    await stopServer(server)
  }
})

test("http_get：超过 200KB 的响应被流式截断并标注字节数", async () => {
  const big = "x".repeat(300_000)
  const { server, base } = startServer((_req, res) => {
    res.writeHead(200, { "Content-Type": "text/plain" })
    res.end(big)
  })
  try {
    const tool = createHttpTool()
    const r = await tool.execute({ url: `${base}/big`, allowPrivate: true })
    assert.match(r.summary, /已截断，共 \d+\+ 字节/)
  } finally {
    await stopServer(server)
  }
})

test("http_get：非 200 响应直接拒绝", async () => {
  const { server, base } = startServer((_req, res) => {
    res.writeHead(404, { "Content-Type": "text/plain" })
    res.end("not found")
  })
  try {
    const tool = createHttpTool()
    await assert.rejects(() => tool.execute({ url: `${base}/missing`, allowPrivate: true }), /HTTP 404/)
  } finally {
    await stopServer(server)
  }
})

test("http_get：默认拒绝内网/回环地址（SSRF 防护）", async () => {
  const { server, base } = startEchoServer()
  try {
    // 走注册表 invoke：zod 解析时 allowPrivate 默认 false，与生产路径一致
    const registry = new ToolRegistry()
    registry.register(createHttpTool())
    await assert.rejects(() => registry.invoke("http_get", { url: `${base}/private` }), /内网|回环/)
  } finally {
    await stopServer(server)
  }
})

test("http_get：allowPrivate 显式放行本地服务", async () => {
  const { server, base } = startEchoServer()
  try {
    const tool = createHttpTool()
    const r = await tool.execute({ url: `${base}/local`, allowPrivate: true })
    assert.equal(r.summary, "pong")
  } finally {
    await stopServer(server)
  }
})

test("isPrivateHost：识别私网/回环主机名", () => {
  assert.equal(isPrivateHost("localhost"), true)
  assert.equal(isPrivateHost("127.0.0.1"), true)
  assert.equal(isPrivateHost("127.8.8.8"), true)
  assert.equal(isPrivateHost("10.1.2.3"), true)
  assert.equal(isPrivateHost("192.168.1.1"), true)
  assert.equal(isPrivateHost("169.254.1.1"), true)
  assert.equal(isPrivateHost("172.16.0.1"), true)
  assert.equal(isPrivateHost("172.31.255.255"), true)
  assert.equal(isPrivateHost("172.32.0.1"), false)
  assert.equal(isPrivateHost("::1"), true)
  assert.equal(isPrivateHost("[::1]"), true)
  assert.equal(isPrivateHost("example.com"), false)
})
