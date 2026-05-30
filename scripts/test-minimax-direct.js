const { PrismaClient } = require("@prisma/client")
const prisma = new PrismaClient()

async function testEndpoint(url, apiKey, testModel, useUserAgent) {
  console.log(`\n--- 调试组合: 目标端点 [${url}] (UA模拟: ${useUserAgent ? "是" : "否"}) ---`)

  const headers = {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${apiKey}`
  }

  if (useUserAgent) {
    headers["User-Agent"] = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
  }

  try {
    const startTime = Date.now()
    const response = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify({
        model: testModel,
        messages: [{ role: "user", content: "Hi" }],
        max_tokens: 5,
      })
    })

    const duration = Date.now() - startTime
    console.log(`状态码: ${response.status} ${response.statusText} (耗时 ${duration}ms)`)
    
    const rawText = await response.text()
    console.log(`响应内容前150字符: ${rawText.slice(0, 150)}`)
    return response.ok
  } catch (error) {
    console.error(`异常: ${error.message} (代码: ${error.code})`)
    return false
  }
}

async function main() {
  console.log("=== 开始高级连通性排查 ===")
  const providers = await prisma.llmProvider.findMany()
  const minimax = providers.find(p => p.name.toLowerCase().includes("minimax"))

  if (!minimax) {
    console.log("错误: 未在数据库中找到 MiniMax 的配置，请先在页面上保存。")
    await prisma.$disconnect()
    return
  }

  const apiKey = minimax.apiKey
  const testModel = minimax.models.split(",")[0]?.trim() || "MiniMax-M2.7"

  // 1. 测试旧域名，无 User-Agent (原策略)
  await testEndpoint(`${minimax.baseUrl}/chat/completions`, apiKey, testModel, false)

  // 2. 测试旧域名，有 User-Agent
  await testEndpoint(`${minimax.baseUrl}/chat/completions`, apiKey, testModel, true)

  // 3. 测试新域名，无 User-Agent
  await testEndpoint("https://api.minimax.chat/v1/chat/completions", apiKey, testModel, false)

  // 4. 测试新域名，有 User-Agent
  await testEndpoint("https://api.minimax.chat/v1/chat/completions", apiKey, testModel, true)

  await prisma.$disconnect()
}

main()
