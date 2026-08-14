// runtime/tests/http-tool.test.ts
import { test } from "node:test"
import assert from "node:assert/strict"
import http from "node:http"
import type { AddressInfo } from "node:net"
import { createHttpTool } from "../tools/http-tool"

function startEchoServer() {
  const server = http.createServer((req, res) => {
    res.writeHead(200, { "Content-Type": "text/plain" })
    res.end("pong")
  })
  server.listen(0)
  const port = (server.address() as AddressInfo).port
  return { server, base: `http://127.0.0.1:${port}` }
}

test("http_get：正常请求与大小上限", async () => {
  const { server, base } = startEchoServer()
  try {
    const tool = createHttpTool()
    const r = await tool.execute({ url: `${base}/x` })
    assert.equal(r.summary, "pong")

    await assert.rejects(() => tool.execute({ url: "ftp://example.com/x" }), /仅支持 http/)
  } finally {
    server.close()
  }
})
