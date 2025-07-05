// API Configuration
export const config = {
  openai: {
    apiKey: process.env.NEXT_PUBLIC_OPENAI_API_KEY || process.env.OPENAI_API_KEY,
    baseUrl: 'https://api.openai.com/v1',
  },
  elevenlabs: {
    apiKey: process.env.NEXT_PUBLIC_ELEVEN_API_KEY || process.env.ELEVEN_API_KEY,
    baseUrl: 'https://api.elevenlabs.io/v1',
  },
};

// Function to get the actual API key being used
export function getActiveApiKey(service: 'openai' | 'elevenlabs'): string | null {
  if (service === 'openai') {
    return process.env.NEXT_PUBLIC_OPENAI_API_KEY || process.env.OPENAI_API_KEY || null;
  } else {
    return process.env.NEXT_PUBLIC_ELEVEN_API_KEY || process.env.ELEVEN_API_KEY || null;
  }
}

// Validation function to check if API keys are configured
export function validateApiKeys(): { isValid: boolean; missingKeys: string[] } {
  const missingKeys: string[] = [];
  
  const openaiKey = getActiveApiKey('openai');
  const elevenlabsKey = getActiveApiKey('elevenlabs');
  
  if (!openaiKey || openaiKey.trim() === '') {
    missingKeys.push('OpenAI API Key');
  }
  
  if (!elevenlabsKey || elevenlabsKey.trim() === '') {
    missingKeys.push('ElevenLabs API Key');
  }
  
  return {
    isValid: missingKeys.length === 0,
    missingKeys,
  };
}