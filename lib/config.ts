// API Configuration
export const config = {
  openai: {
    apiKey: (typeof window !== 'undefined' && (window as any).DEMO_OPENAI_KEY) || 
            (typeof window !== 'undefined' && localStorage.getItem('OPENAI_API_KEY')) ||
            process.env.NEXT_PUBLIC_OPENAI_API_KEY || 
            process.env.OPENAI_API_KEY,
    baseUrl: 'https://api.openai.com/v1',
  },
  elevenlabs: {
    apiKey: (typeof window !== 'undefined' && (window as any).DEMO_ELEVEN_KEY) || 
            (typeof window !== 'undefined' && localStorage.getItem('ELEVEN_API_KEY')) ||
            process.env.NEXT_PUBLIC_ELEVEN_API_KEY || 
            process.env.ELEVEN_API_KEY,
    baseUrl: 'https://api.elevenlabs.io/v1',
  },
};

// Validation function to check if API keys are configured
export function validateApiKeys(): { isValid: boolean; missingKeys: string[] } {
  const missingKeys: string[] = [];
  
  const openaiKey = (typeof window !== 'undefined' && localStorage.getItem('OPENAI_API_KEY')) || 
                   config.openai.apiKey;
  const elevenlabsKey = (typeof window !== 'undefined' && localStorage.getItem('ELEVEN_API_KEY')) || 
                       config.elevenlabs.apiKey;
  
  if (!openaiKey) {
    missingKeys.push('OpenAI API Key');
  }
  
  if (!elevenlabsKey) {
    missingKeys.push('ElevenLabs API Key');
  }
  
  return {
    isValid: missingKeys.length === 0,
    missingKeys,
  };
}