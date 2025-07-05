'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ConversationDisplay } from '@/components/voice-agent/conversation-display';
import { VoiceControls } from '@/components/voice-agent/voice-controls';
import { CallMetrics } from '@/components/voice-agent/call-metrics';
import { ErrorDisplay } from '@/components/voice-agent/error-display';
import { EmailInput } from '@/components/voice-agent/email-input';
import { AudioRecorder, AudioPlayer } from '@/lib/audio';
import { transcribeAudio, getChatResponse, synthesizeSpeech } from '@/lib/apis';
import { validateApiKeys } from '@/lib/config';
import { Message, ConversationState } from '@/types/conversation';
import { EmailData } from '@/lib/email-parser';
import { Phone, PhoneOff, Target, MapPin, Users, Mic, MicOff } from 'lucide-react';

export default function Home() {
  const [conversationState, setConversationState] = useState<ConversationState>({
    isRecording: false,
    isProcessing: false,
    isPlaying: false,
    currentMessage: '',
    messages: [],
    error: null,
  });

  const [callStartTime, setCallStartTime] = useState<Date | null>(null);
  const [isCallActive, setIsCallActive] = useState(false);
  const [emailData, setEmailData] = useState<EmailData | null>(null);
  const [isClient, setIsClient] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [currentVolume, setCurrentVolume] = useState(0);

  const audioRecorderRef = useRef<AudioRecorder | null>(null);
  const audioPlayerRef = useRef<AudioPlayer | null>(null);
  const volumeMonitorRef = useRef<number | null>(null);

  useEffect(() => {
    setIsClient(true);
    audioRecorderRef.current = new AudioRecorder();
    audioPlayerRef.current = new AudioPlayer();

    return () => {
      audioPlayerRef.current?.cleanup();
      if (volumeMonitorRef.current) {
        cancelAnimationFrame(volumeMonitorRef.current);
      }
    };
  }, []);

  const handleEmailParsed = (data: EmailData) => {
    setEmailData(data);
  };

  const startCall = () => {
    setIsCallActive(true);
    setCallStartTime(new Date());
    setConversationState(prev => ({
      ...prev,
      messages: [],
      error: null,
    }));
    
    // Start continuous listening
    startContinuousListening();
  };

  const endCall = () => {
    setIsCallActive(false);
    setCallStartTime(null);
    setIsListening(false);
    audioPlayerRef.current?.stopAudio();
    audioRecorderRef.current?.stopRecording().catch(() => {});
    
    if (volumeMonitorRef.current) {
      cancelAnimationFrame(volumeMonitorRef.current);
    }
    
    setConversationState(prev => ({
      ...prev,
      isRecording: false,
      isProcessing: false,
      isPlaying: false,
    }));
  };

  const startContinuousListening = async () => {
    try {
      setConversationState(prev => ({ ...prev, error: null }));
      
      const validation = validateApiKeys();
      if (!validation.isValid) {
        throw new Error(`API keys not configured: ${validation.missingKeys.join(', ')}`);
      }

      setIsListening(true);
      setConversationState(prev => ({ ...prev, isRecording: true }));

      await audioRecorderRef.current?.startRecording({
        onSilenceDetected: handleSilenceDetected,
        onSpeechDetected: handleSpeechDetected,
        silenceTimeout: 2000, // 2 seconds of silence
      });

      // Start volume monitoring
      monitorVolume();

    } catch (error) {
      setIsListening(false);
      setConversationState(prev => ({
        ...prev,
        isRecording: false,
        error: error instanceof Error ? error.message : 'Failed to start listening',
      }));
    }
  };

  const monitorVolume = () => {
    const updateVolume = () => {
      if (audioRecorderRef.current && isListening) {
        const volume = audioRecorderRef.current.getCurrentVolume();
        setCurrentVolume(volume);
        volumeMonitorRef.current = requestAnimationFrame(updateVolume);
      }
    };
    updateVolume();
  };

  const handleSilenceDetected = async () => {
    if (!isListening || conversationState.isProcessing) return;

    try {
      const audioBlob = await audioRecorderRef.current?.stopRecording();
      if (!audioBlob || audioBlob.size < 1000) {
        // Audio too short, restart listening
        restartListening();
        return;
      }

      setConversationState(prev => ({ 
        ...prev, 
        isRecording: false, 
        isProcessing: true 
      }));

      // Process the audio
      await processAudioMessage(audioBlob);

    } catch (error) {
      console.error('Error processing silence detection:', error);
      restartListening();
    }
  };

  const handleSpeechDetected = () => {
    // Stop any current playback when user starts speaking
    if (audioPlayerRef.current?.isCurrentlyPlaying()) {
      audioPlayerRef.current.stopAudio();
      setConversationState(prev => ({ ...prev, isPlaying: false }));
    }
  };

  const processAudioMessage = async (audioBlob: Blob) => {
    try {
      // Transcribe audio
      const transcription = await transcribeAudio(audioBlob);
      
      if (!transcription.trim()) {
        restartListening();
        return;
      }

      // Add user message
      const userMessage: Message = {
        id: Date.now().toString(),
        type: 'user',
        content: transcription,
        timestamp: new Date(),
      };

      setConversationState(prev => ({
        ...prev,
        messages: [...prev.messages, userMessage],
      }));

      // Get chat response
      const chatHistory = [
        ...conversationState.messages.map(msg => ({
          role: msg.type === 'user' ? 'user' : 'assistant',
          content: msg.content,
        })),
        { role: 'user', content: transcription },
      ];

      const agentResponse = await getChatResponse(
        chatHistory,
        emailData?.salespersonName,
        emailData?.clientName,
        emailData?.companyName,
        emailData?.hasClientReply,
        emailData?.clientReplyContent
      );

      // Add agent message
      const agentMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'agent',
        content: agentResponse,
        timestamp: new Date(),
      };

      setConversationState(prev => ({
        ...prev,
        messages: [...prev.messages, agentMessage],
        isProcessing: false,
        isPlaying: true,
      }));

      // Convert to speech and play
      const audioBuffer = await synthesizeSpeech(agentResponse);
      
      await audioPlayerRef.current?.playAudio(audioBuffer, {
        onPlaybackEnd: () => {
          setConversationState(prev => ({ ...prev, isPlaying: false }));
          // Restart listening after agent finishes speaking
          if (isCallActive) {
            setTimeout(() => restartListening(), 500);
          }
        }
      });

    } catch (error) {
      setConversationState(prev => ({
        ...prev,
        isProcessing: false,
        isPlaying: false,
        error: error instanceof Error ? error.message : 'An error occurred',
      }));
      
      // Restart listening even after error
      if (isCallActive) {
        setTimeout(() => restartListening(), 2000);
      }
    }
  };

  const restartListening = async () => {
    if (!isCallActive) return;
    
    try {
      setConversationState(prev => ({ ...prev, isRecording: true }));
      
      await audioRecorderRef.current?.startRecording({
        onSilenceDetected: handleSilenceDetected,
        onSpeechDetected: handleSpeechDetected,
        silenceTimeout: 2000,
      });
    } catch (error) {
      console.error('Error restarting listening:', error);
      setConversationState(prev => ({
        ...prev,
        isRecording: false,
        error: 'Failed to restart listening',
      }));
    }
  };

  const handleManualStop = () => {
    if (audioPlayerRef.current?.isCurrentlyPlaying()) {
      audioPlayerRef.current.stopAudio();
      setConversationState(prev => ({ ...prev, isPlaying: false }));
      
      // Restart listening after stopping playback
      if (isCallActive) {
        setTimeout(() => restartListening(), 500);
      }
    }
  };

  const handleDismissError = () => {
    setConversationState(prev => ({ ...prev, error: null }));
  };

  const canStartCall = emailData?.salespersonName && emailData?.clientName;

  if (!isClient) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-teal-50 dark:from-slate-900 dark:via-blue-900 dark:to-teal-900">
      <div className="container mx-auto p-6 max-w-6xl">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-teal-600 bg-clip-text text-transparent mb-2">
            Real-Time Voice Agent
          </h1>
          <p className="text-lg text-muted-foreground">
            AI-powered natural conversations with automatic speech detection and interruption handling
          </p>
        </div>

        {/* Email Input */}
        <EmailInput onEmailParsed={handleEmailParsed} emailData={emailData} />

        {/* Error Display */}
        {conversationState.error && (
          <ErrorDisplay 
            error={conversationState.error} 
            onDismiss={handleDismissError} 
          />
        )}

        {/* Call Controls */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Call Status</span>
              <div className="flex gap-2">
                {!isCallActive ? (
                  <Button
                    onClick={startCall}
                    disabled={!canStartCall}
                    className="bg-green-600 hover:bg-green-700 text-white disabled:opacity-50"
                  >
                    <Phone className="h-4 w-4 mr-2" />
                    Start Real-Time Call
                  </Button>
                ) : (
                  <Button
                    onClick={endCall}
                    variant="destructive"
                  >
                    <PhoneOff className="h-4 w-4 mr-2" />
                    End Call
                  </Button>
                )}
              </div>
            </CardTitle>
            <CardDescription className="flex items-center gap-4">
              <span>
                {!canStartCall 
                  ? 'Configure your email details first to personalize the conversation'
                  : isCallActive 
                    ? `Active call: ${emailData?.salespersonName} → ${emailData?.clientName}` 
                    : `Ready to call ${emailData?.clientName} as ${emailData?.salespersonName}`
                }
              </span>
              
              {isCallActive && (
                <div className="flex items-center gap-2">
                  {isListening ? (
                    <div className="flex items-center gap-2 text-green-600">
                      <Mic className="h-4 w-4" />
                      <span className="text-sm">Listening</span>
                      <div 
                        className="w-8 h-2 bg-green-200 rounded-full overflow-hidden"
                      >
                        <div 
                          className="h-full bg-green-500 transition-all duration-100"
                          style={{ width: `${Math.min(100, (currentVolume / 50) * 100)}%` }}
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-gray-500">
                      <MicOff className="h-4 w-4" />
                      <span className="text-sm">Not listening</span>
                    </div>
                  )}
                </div>
              )}
            </CardDescription>
          </CardHeader>
        </Card>

        {/* Call Metrics */}
        {isCallActive && (
          <div className="mb-6">
            <CallMetrics 
              messages={conversationState.messages}
              callStartTime={callStartTime}
              isActive={isCallActive}
            />
          </div>
        )}

        {/* Main Interface */}
        {isCallActive ? (
          <div className="grid lg:grid-cols-3 gap-6">
            {/* Conversation Display */}
            <div className="lg:col-span-2">
              <ConversationDisplay 
                messages={conversationState.messages}
                isProcessing={conversationState.isProcessing}
              />
            </div>

            {/* Voice Controls & Context */}
            <div className="space-y-4">
              {/* Real-time Status */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Real-Time Status</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Listening:</span>
                    <span className={`text-sm font-medium ${isListening ? 'text-green-600' : 'text-gray-500'}`}>
                      {isListening ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Processing:</span>
                    <span className={`text-sm font-medium ${conversationState.isProcessing ? 'text-blue-600' : 'text-gray-500'}`}>
                      {conversationState.isProcessing ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Speaking:</span>
                    <span className={`text-sm font-medium ${conversationState.isPlaying ? 'text-purple-600' : 'text-gray-500'}`}>
                      {conversationState.isPlaying ? 'Active' : 'Inactive'}
                    </span>
                  </div>

                  {conversationState.isPlaying && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleManualStop}
                      className="w-full"
                    >
                      Stop Agent & Resume Listening
                    </Button>
                  )}
                </CardContent>
              </Card>

              {/* Call Context */}
              {emailData && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Call Context</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      <span><strong>You:</strong> {emailData.salespersonName}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span><strong>Client:</strong> {emailData.clientName}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                      <span><strong>Company:</strong> {emailData.companyName}</span>
                    </div>
                    {emailData.hasClientReply && (
                      <div className="flex items-center gap-2 text-amber-600">
                        <div className="w-2 h-2 bg-amber-500 rounded-full"></div>
                        <span><strong>Has replied to email</strong></span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Strategic Goals */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Target className="h-4 w-4 text-orange-500" />
                    Strategic Goals
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm text-muted-foreground">
                  <div className="flex items-start gap-2">
                    <Users className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-medium text-foreground">Discover Target Audience</p>
                      <p>Who are their customers? Demographics, business type, etc.</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <MapPin className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-medium text-foreground">Identify Target Location</p>
                      <p>What markets do they serve? Geographic focus areas?</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <Phone className="h-4 w-4 text-purple-500 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-medium text-foreground">Build Relationship</p>
                      <p>Establish trust before presenting solutions</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Real-time Tips */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Real-Time Features</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm text-muted-foreground">
                  <p>• Automatic speech detection - just start talking</p>
                  <p>• Interrupt the agent anytime by speaking</p>
                  <p>• 2-second silence triggers response</p>
                  <p>• Optimized for natural conversation flow</p>
                  <p>• Real-time volume monitoring</p>
                </CardContent>
              </Card>
            </div>
          </div>
        ) : (
          <Card className="text-center py-12">
            <CardContent>
              <Phone className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-xl font-semibold mb-2">
                {canStartCall ? 'Ready for Real-Time Call' : 'Configure Your Call'}
              </h3>
              <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                {canStartCall 
                  ? `Start your real-time call as ${emailData?.salespersonName} to ${emailData?.clientName}. The conversation will flow naturally with automatic speech detection.`
                  : 'Configure your email details above to create a personalized conversation experience with real-time voice interaction.'
                }
              </p>
              {canStartCall && (
                <Button
                  onClick={startCall}
                  size="lg"
                  className="bg-gradient-to-r from-blue-600 to-teal-600 hover:from-blue-700 hover:to-teal-700 text-white"
                >
                  <Phone className="h-5 w-5 mr-2" />
                  Start Real-Time Call
                </Button>
              )}
            </CardContent>
          </Card>
        )}

        {/* Footer */}
        <div className="mt-12 text-center text-sm text-muted-foreground">
          <p>Powered by OpenAI GPT-4, Whisper API, and ElevenLabs Voice Synthesis</p>
          <p className="mt-1">Real-time conversation with automatic speech detection and interruption handling</p>
        </div>
      </div>
    </div>
  );
}