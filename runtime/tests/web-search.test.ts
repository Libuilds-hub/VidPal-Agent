// runtime/tests/web-search.test.ts
import { test } from "node:test"
import assert from "node:assert/strict"
import { parseDuckDuckGoHtml, looksLikeAnomaly } from "../tools/web-search"

test("parseDuckDuckGoHtml：解析结果条目", () => {
  const html = `
<html><body>
<div class="result results_links results_links_deep web-result">
  <a rel="nofollow" class="result__a" href="//duckduckgo.com/l/?uddg=https%3A%2F%2Fexample.com%2Fpage&amp;rut=abc">示例标题</a>
  <a class="result__snippet" href="//duckduckgo.com/l/?uddg=https%3A%2F%2Fexample.com%2Fpage">这是一段摘要文本。</a>
</div>
<div class="result results_links results_links_deep web-result">
  <a rel="nofollow" class="result__a" href="//duckduckgo.com/l/?uddg=https%3A%2F%2Fother.org%2Fx">另一个结果</a>
  <a class="result__snippet" href="//duckduckgo.com/l/?uddg=https%3A%2F%2Fother.org%2Fx">第二条摘要。</a>
</div>
</body></html>`
  const results = parseDuckDuckGoHtml(html)
  assert.equal(results.length, 2)
  assert.equal(results[0].title, "示例标题")
  assert.equal(results[0].url, "https://example.com/page")
  assert.match(results[0].snippet, /摘要/)
  assert.equal(results[1].url, "https://other.org/x")
})

test("parseDuckDuckGoHtml：空页返回空数组", () => {
  assert.deepEqual(parseDuckDuckGoHtml("<html><body>no results</body></html>"), [])
})

test("parseDuckDuckGoHtml：坏 uddg 不炸整个解析", () => {
  const html = `
<html><body>
<div class="result results_links results_links_deep web-result">
  <a rel="nofollow" class="result__a" href="//duckduckgo.com/l/?uddg=https%3A%2F%2Fexample.com%2Fok&amp;rut=good">好结果</a>
  <a class="result__snippet" href="//duckduckgo.com/l/?uddg=https%3A%2F%2Fexample.com%2Fok">好摘要。</a>
</div>
<div class="result results_links results_links_deep web-result">
  <a rel="nofollow" class="result__a" href="//duckduckgo.com/l/?uddg=%zz&rut=bad">坏结果</a>
</div>
</body></html>`
  const results = parseDuckDuckGoHtml(html)
  assert.equal(results.length, 1)
  assert.equal(results[0].title, "好结果")
  assert.equal(results[0].url, "https://example.com/ok")
})

test("looksLikeAnomaly：识别 DDG 反爬/限流页", () => {
  const anomalyHtml = `<html><body><h1>Anomaly detected</h1><p>If this problem persists, please contact us.</p></body></html>`
  assert.equal(looksLikeAnomaly(anomalyHtml), true)
  assert.equal(looksLikeAnomaly("We use a captcha to protect from unusual traffic"), true)
  assert.equal(looksLikeAnomaly("challenge"), true)
  assert.equal(
    looksLikeAnomaly(`<html><body><div class="result">normal search results here</div></body></html>`),
    false
  )
})
