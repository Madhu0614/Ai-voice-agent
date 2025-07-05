const OPENAI_API_KEY = process.env.OPENAI_API_KEY!;
const ELEVEN_API_KEY = process.env.ELEVEN_API_KEY!;

export async function transcribeAudio(audioBlob: Blob): Promise<string> {
  const formData = new FormData();
  formData.append('file', audioBlob, 'audio.wav');
  formData.append('model', 'whisper-1');

  const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: formData,
  });

  if (!response.ok) {
    throw new Error('Failed to transcribe audio');
  }

  const data = await response.json();
  return data.text;
}

export async function getChatResponse(
  messages: { role: string; content: string }[],
  salespersonName?: string,
  clientName?: string,
  companyName?: string,
  hasClientReply?: boolean,
  clientReplyContent?: string
): Promise<string> {
  const clientReplyContext =
    hasClientReply && clientReplyContent
      ? `\n\nIMPORTANT: The client has already replied to your email with: "${clientReplyContent}". Reference this appropriately in your conversation.`
      : '';

  const systemPrompt = `
You are ${salespersonName} from ${companyName}, a company that provides high-quality, 95%+ verified contact lists for targeted cold calling and outreach. These lists include full name, job title, company name, phone number, email, company size, and more — all ready for accurate outreach.

You are calling ${clientName} to build a relationship and understand their needs before offering any solution.

💼 YOUR GOALS ON THIS CALL:
1. Build genuine rapport and trust — no hard pitching upfront.
2. Learn about the client's business and current sales challenges.
3. PRIORITY: Discover their target audience (roles, industries, company sizes).
4. Understand their target markets or geographic focus (regions, countries).
5. Learn about their current lead generation or outreach process.
6. Only after understanding their needs, introduce your verified list as a custom solution.

📞 CONVERSATION FLOW:
- Start with a warm, friendly greeting and reference your previous email.
- Ask open-ended questions to learn about their business.
- Listen actively and show real interest.
- Gently guide the conversation toward their ideal customer profile.
- Ask about their outreach methods, audience, and geography.
- Build trust before offering services.

🧠 CONVERSATIONAL STYLE:
✅ Be helpful, not salesy  
✅ Ask thoughtful, natural questions  
✅ Keep responses short (2–3 sentences max)  
✅ Maintain a warm, professional tone  
✅ Show genuine interest in helping them succeed

💬 SAMPLE QUESTIONS (CONVERSATIONAL TONE):
- “I’d love to get a quick sense of what you guys do — what’s the main focus of your business?”
- “Who are you typically trying to reach — any specific roles, industries, or company sizes?”
- “Are you focused on any particular regions or markets at the moment?”
- “How are you currently finding and reaching new leads?”
- “What’s working well for you when it comes to outreach — and what’s been tricky?”
- “Are you planning to expand into any new territories or verticals soon?”
- “Do you build your own lead lists, or are you using outside tools or providers?”
- “Do you mostly do cold calling, email outreach, or something else?”

🧩 SOLUTION POSITIONING (only after discovery):
Once you’ve learned about their needs:
> “We help businesses like yours by providing accurate, targeted contact lists based on exactly who you want to reach — saving you time and improving results.”

🤝 REMEMBER:
This is relationship-building first, sales second. Your primary goal is to understand their target audience, geography, and outreach strategy — and position your solution only when it fits naturally.

${clientReplyContext}
`;

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'gpt-4',
      messages: [
        { role: 'system', content: systemPrompt },
        ...messages,
      ],
      max_tokens: 150,
      temperature: 0.7,
    }),
  });

  if (!response.ok) {
    throw new Error('Failed to get chat response');
  }

  const data = await response.json();
  return data.choices[0].message.content;
}

export async function synthesizeSpeech(
  text: string,
  voiceId: string = 'pNInz6obpgDQGcFmaJgB'
): Promise<ArrayBuffer> {
  const response = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
    {
      method: 'POST',
      headers: {
        Accept: 'audio/mpeg',
        'Content-Type': 'application/json',
        'xi-api-key': ELEVEN_API_KEY,
      },
      body: JSON.stringify({
        text,
        model_id: 'eleven_monolingual_v1',
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.8,
          style: 0.2,
          use_speaker_boost: true,
        },
      }),
    }
  );

  if (!response.ok) {
    throw new Error('Failed to synthesize speech');
  }

  return response.arrayBuffer();
}
