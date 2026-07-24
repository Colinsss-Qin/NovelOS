/* ================================================================
   OpenAI-Compatible Provider Base (Node.js / CommonJS)
   Shared HTTP + SSE logic for DeepSeek, Kimi, and any
   OpenAI-compatible API.
   ================================================================ */

class OpenAICompatProvider {
  constructor(config) {
    this.name = config.name;
    this.baseURL = config.baseURL;
    this.model = config.model;
    this.apiKey = config.apiKey;
  }

  /**
   * Non-streaming generate.
   */
  async generate(opts) {
    const messages = opts.messages || [
      ...(opts.systemPrompt ? [{ role: "system", content: opts.systemPrompt }] : []),
      { role: "user", content: opts.userPrompt || opts.prompt },
    ];
    const res = await fetch(`${this.baseURL}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: opts.model || this.model,
        messages,
        temperature: opts.temperature ?? 0.7,
        max_tokens: opts.maxTokens ?? 4096,
        stream: false,
      }),
      signal: opts.signal,
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`${this.name} API error (${res.status}): ${err}`);
    }

    const json = await res.json();
    const choice = json.choices?.[0];
    return {
      content: choice?.message?.content ?? "",
      tokenUsed: json.usage?.total_tokens ?? 0,
      model: json.model ?? this.model,
      finishReason: choice?.finish_reason ?? "stop",
    };
  }

  /**
   * Streaming generate — yields token strings via an async generator.
   */
  async *generateStream(opts) {
    const startTime = Date.now();
    const messages = opts.messages || [
      ...(opts.systemPrompt ? [{ role: "system", content: opts.systemPrompt }] : []),
      { role: "user", content: opts.userPrompt || opts.prompt },
    ];
    const res = await fetch(`${this.baseURL}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: opts.model || this.model,
        messages,
        temperature: opts.temperature ?? 0.7,
        max_tokens: opts.maxTokens ?? 4096,
        stream: true,
      }),
      signal: opts.signal,
    });

    if (!res.ok) {
      const err = await res.text();
      console.error(`[${this.name}] API error (${res.status}):`, err.slice(0, 500));
      throw new Error(`${this.name} API error (${res.status}): ${err.slice(0, 200)}`);
    }

    // Node.js ReadableStream → async iterator over SSE chunks
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let tokenCount = 0;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith("data: ")) continue;
        const data = trimmed.slice(6);
        if (data === "[DONE]") {
          const elapsed = Date.now() - startTime;
          if (tokenCount === 0) {
            console.error(`[${this.name}] stream completed with 0 tokens in ${elapsed}ms`);
            throw new Error(`${this.name}: API 返回了空内容（0 token），请检查 API Key 余额或模型是否可用`);
          }
          console.log(`[${this.name}] stream done: ${tokenCount} tokens in ${elapsed}ms`);
          return;
        }

        try {
          const json = JSON.parse(data);
          // Check for inline error in SSE (some APIs return errors in-stream)
          if (json.error) {
            console.error(`[${this.name}] SSE error:`, JSON.stringify(json.error));
            throw new Error(`${this.name} API error: ${json.error.message || JSON.stringify(json.error)}`);
          }
          const content = json.choices?.[0]?.delta?.content;
          if (content) {
            tokenCount++;
            yield content;
          }
        } catch (e) {
          if (e.message && e.message.includes(this.name)) throw e; // re-throw our own errors
          // skip malformed chunks
        }
      }
    }

    // If we exit the loop without [DONE], that's also an error
    const elapsed = Date.now() - startTime;
    if (tokenCount === 0) {
      console.error(`[${this.name}] stream ended without [DONE] and 0 tokens in ${elapsed}ms`);
      throw new Error(`${this.name}: API 连接中断，未收到任何内容`);
    }
    console.log(`[${this.name}] stream ended (no [DONE]): ${tokenCount} tokens in ${elapsed}ms`);
  }
}

module.exports = { OpenAICompatProvider };
