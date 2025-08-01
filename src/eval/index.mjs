import 'dotenv/config'
import OpenAI from 'openai'

const openai = new OpenAI()

export async function gradeSection(text) {
  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: 'Return JSON: { "score": <0-100>, "reason": "" }' },
      { role: 'user', content: text }
    ]
  })
  const response = JSON.parse(completion.choices[0].message.content)
  return response.score
}

