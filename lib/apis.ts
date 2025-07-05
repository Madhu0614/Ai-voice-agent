import { config, getActiveApiKey } from './config';

export async function transcribeAudio(audioBlob: Blob): Promise<string> {
  const apiKey = getActiveApiKey('openai');
  
  if (!apiKey) {
    throw new Error('OpenAI API key is not configured. Please add NEXT_PUBLIC_OPENAI_API_KEY to your environment variables or configure it in the API setup.');
  }

  const formData = new FormData();
  formData.append('file', audioBlob, 'audio.wav');
  formData.append('model', 'whisper-1');

  const response = await fetch(`${config.openai.baseUrl}/audio/transcriptions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
    body: formData,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    console.error('Transcription error:', errorData);
    throw new Error(`Failed to transcribe audio: ${response.status} ${response.statusText}`);
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
  const apiKey = getActiveApiKey('openai');
  
  if (!apiKey) {
    throw new Error('OpenAI API key is not configured. Please add NEXT_PUBLIC_OPENAI_API_KEY to your environment variables or configure it in the API setup.');
  }

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
- "I'd love to get a quick sense of what you guys do — what's the main focus of your business?"
- "Who are you typically trying to reach — any specific roles, industries, or company sizes?"
- "Are you focused on any particular regions or markets at the moment?"
- "How are you currently finding and reaching new leads?"
- "What's working well for you when it comes to outreach — and what's been tricky?"
- "Are you planning to expand into any new territories or verticals soon?"
- "Do you build your own lead lists, or are you using outside tools or providers?"
- "Do you mostly do cold calling, email outreach, or something else?"

🧩 SOLUTION POSITIONING (only after discovery):
Once you've learned about their needs:
> "We help businesses like yours by providing accurate, targeted contact lists based on exactly who you want to reach — saving you time and improving results."

🤝 REMEMBER:
This is relationship-building first, sales second. Your primary goal is to understand their target audience, geography, and outreach strategy — and position your solution only when it fits naturally.

${clientReplyContext}
`;

  const response = await fetch(`${config.openai.baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
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
    const errorData = await response.json().catch(() => ({}));
    console.error('Chat completion error:', errorData);
    throw new Error(`Failed to get chat response: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  return data.choices[0].message.content;
}

export async function synthesizeSpeech(
  text: string,
  voiceId: string = 'pNInz6obpgDQGcFmaJgB'
): Promise<ArrayBuffer> {
  const apiKey = getActiveApiKey('elevenlabs');
  
  if (!apiKey) {
    throw new Error('ElevenLabs API key is not configured. Please add NEXT_PUBLIC_ELEVEN_API_KEY to your environment variables or configure it in the API setup.');
  }

  // Log the API key being used for debugging (first 10 characters only)
  console.log('Using ElevenLabs API key:', apiKey.substring(0, 10) + '...');

  const response = await fetch(
    `${config.elevenlabs.baseUrl}/text-to-speech/${voiceId}`,
    {
      method: 'POST',
      headers: {
        Accept: 'audio/mpeg',
        'Content-Type': 'application/json',
        'xi-api-key': apiKey,
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
    const errorData = await response.json().catch(() => ({}));
    console.error('Speech synthesis error:', errorData);
    
    // Provide more specific error messages
    if (response.status === 401 || (errorData.detail && errorData.detail.status === 'invalid_api_key')) {
      throw new Error('Invalid ElevenLabs API key. Please check your API key and try again. You can clear stored keys and reconfigure them in the API setup.');
    }
    
    throw new Error(`Failed to synthesize speech: ${response.status} ${response.statusText}`);
  }

  return response.arrayBuffer();
}