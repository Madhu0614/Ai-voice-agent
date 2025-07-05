export interface Message {
  id: string;
  type: 'user' | 'agent';
  content: string;
  timestamp: Date;
  audioUrl?: string;
}

export interface ConversationState {
  isRecording: boolean;
  isProcessing: boolean;
  isPlaying: boolean;
  currentMessage: string;
  messages: Message[];
  error: string | null;
}

export interface VoiceAgentConfig {
  systemPrompt: string;
  voiceId: string;
  model: string;
}