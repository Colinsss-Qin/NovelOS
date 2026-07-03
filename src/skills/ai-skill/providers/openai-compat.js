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
    const res = await fetch(`${this.baseURL}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        messages: [
          ...(opts.systemPrompt ? [{ role: "system", content: opts.systemPrompt }] : []),
          { role: "user", content: opts.userPrompt || opts.prompt },
        ],
        temperature: opts.temperature ?? 0.7,
        max_tokens: opts.maxTokens ?? 4096,
        stream: false,
      }),
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
    const res = await fetch(`${this.baseURL}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        messages: [
          ...(opts.systemPrompt ? [{ role: "system", content: opts.systemPrompt }] : []),
          { role: "user", content: opts.userPrompt || opts.prompt },
        ],
        temperature: opts.temperature ?? 0.7,
        max_tokens: opts.maxTokens ?? 4096,
        stream: true,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`${this.name} API error (${res.status}): ${err}`);
    }

    // Node.js ReadableStream → async iterator over SSE chunks
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

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
        if (data === "[DONE]") return;

        try {
          const json = JSON.parse(data);
          const content = json.choices?.[0]?.delta?.content;
          if (content) yield content;
        } catch {
          // skip malformed chunks
        }
      }
    }
  }
}

module.exports = { OpenAICompatProvider };
