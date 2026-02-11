/**
 * LLM API Client for CxO Council
 * Supports OpenRouter and Anthropic
 */

export class LLMClient {
  constructor(private apiKey: string) {}

  async query(
    prompt: string,
    model: string,
    temperature: number = 0.7
  ): Promise<string> {
    if (model.startsWith('openrouter:')) {
      return this.queryOpenRouter(prompt, model, temperature)
    } else if (model.startsWith('anthropic:')) {
      return this.queryAnthropic(prompt, model, temperature)
    } else if (model.startsWith('openai:')) {
      return this.queryOpenAI(prompt, model, temperature)
    } else {
      throw new Error(`Unknown model provider: ${model}`)
    }
  }

  private async queryOpenRouter(
    prompt: string,
    model: string,
    temperature: number
  ): Promise<string> {
    const modelName = model.replace('openrouter:', '')

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://github.com/yourusername/cxo-council',
      },
      body: JSON.stringify({
        model: modelName,
        messages: [{ role: 'user', content: prompt }],
        temperature
      })
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`OpenRouter API error (${response.status}): ${errorText}`)
    }

    const data: any = await response.json()
    return data.choices[0].message.content
  }

  private async queryAnthropic(
    prompt: string,
    model: string,
    temperature: number
  ): Promise<string> {
    const modelName = model.replace('anthropic:', '')

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: modelName,
        max_tokens: 4096,
        messages: [{ role: 'user', content: prompt }],
        temperature
      })
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Anthropic API error (${response.status}): ${errorText}`)
    }

    const data: any = await response.json()
    return data.content[0].text
  }

  private async queryOpenAI(
    prompt: string,
    model: string,
    temperature: number
  ): Promise<string> {
    const modelName = model.replace('openai:', '')

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: modelName,
        messages: [{ role: 'user', content: prompt }],
        temperature
      })
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`OpenAI API error (${response.status}): ${errorText}`)
    }

    const data: any = await response.json()
    return data.choices[0].message.content
  }
}
