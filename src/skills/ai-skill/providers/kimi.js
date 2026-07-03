/* Kimi (Moonshot) Provider — inherits OpenAICompatProvider */
const { OpenAICompatProvider } = require("./openai-compat");

class KimiProvider extends OpenAICompatProvider {
  constructor() {
    super({
      name: "kimi",
      baseURL: "https://api.moonshot.cn/v1",
      model: process.env.KIMI_MODEL || "moonshot-v1-8k",
      apiKey: process.env.KIMI_API_KEY || "",
    });
  }
}

module.exports = { KimiProvider };
