/* Claude Provider — Anthropic Messages API (standalone, not OpenAI-compatible) */
class ClaudeProvider {
  constructor() {
    this.name = "claude";
    this.baseURL = "https://api.anthropic.com/v1";
    this.model = "claude-sonnet-4-6";
    this.apiKey = process.env.ANTHROPIC_API_KEY || "";
  }

  async generate(opts) {
    const res = await fetch(`${this.baseURL}/messages`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": this.apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: this.model,
        max_tokens: opts.maxTokens ?? 4096,
        temperature: opts.temperature ?? 0.7,
        system: opts.systemPrompt
          ? [{ type: "text", text: opts.systemPrompt }]
          : undefined,
        messages: [{ role: "user", content: opts.userPrompt || opts.prompt }],
      }),
      signal: opts.signal,
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Claude API error (${res.status}): ${err}`);
    }

    const json = await res.json();
    const text = json.content?.[0]?.text ?? "";

    return {
      content: text,
      tokenUsed: (json.usage?.input_tokens ?? 0) + (json.usage?.output_tokens ?? 0),
      model: json.model ?? this.model,
      finishReason: json.stop_reason ?? "stop",
    };
  }

  async *generateStream(opts) {
    const res = await fetch(`${this.baseURL}/messages`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": this.apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: this.model,
        max_tokens: opts.maxTokens ?? 4096,
        temperature: opts.temperature ?? 0.7,
        system: opts.systemPrompt
          ? [{ type: "text", text: opts.systemPrompt }]
          : undefined,
        messages: [{ role: "user", content: opts.userPrompt || opts.prompt }],
        stream: true,
      }),
      signal: opts.signal,
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Claude API error (${res.status}): ${err}`);
    }

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

        try {
          const json = JSON.parse(data);
          if (json.type === "content_block_delta") {
            const text = json.delta?.text;
            if (text) yield text;
          }
        } catch {
          // skip
        }
      }
    }
  }
}

module.exports = { ClaudeProvider };
