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

// Function to get the actual API key being used
export function getActiveApiKey(service: 'openai' | 'elevenlabs'): string | null {
  if (service === 'openai') {
    return (typeof window !== 'undefined' && (window as any).DEMO_OPENAI_KEY) || 
           (typeof window !== 'undefined' && localStorage.getItem('OPENAI_API_KEY')) ||
           process.env.NEXT_PUBLIC_OPENAI_API_KEY || 
           process.env.OPENAI_API_KEY || null;
  } else {
    return (typeof window !== 'undefined' && (window as any).DEMO_ELEVEN_KEY) || 
           (typeof window !== 'undefined' && localStorage.getItem('ELEVEN_API_KEY')) ||
           process.env.NEXT_PUBLIC_ELEVEN_API_KEY || 
           process.env.ELEVEN_API_KEY || null;
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

// Function to clear localStorage API keys (useful for debugging)
export function clearStoredApiKeys(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('OPENAI_API_KEY');
    localStorage.removeItem('ELEVEN_API_KEY');
  }
}