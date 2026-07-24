/* DeepSeek Provider — inherits OpenAICompatProvider */
const { OpenAICompatProvider } = require("./openai-compat");

class DeepSeekProvider extends OpenAICompatProvider {
  constructor() {
    super({
      name: "deepseek",
      baseURL: "https://api.deepseek.com/v1",
      model: process.env.DEEPSEEK_MODEL || "deepseek-chat",
      apiKey: process.env.DEEPSEEK_API_KEY || "",
    });
  }
}

module.exports = { DeepSeekProvider };
