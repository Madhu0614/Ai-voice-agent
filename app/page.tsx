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
import { Phone, PhoneOff, Target, MapPin, Users } from 'lucide-react';

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

  const audioRecorderRef = useRef<AudioRecorder | null>(null);
  const audioPlayerRef = useRef<AudioPlayer | null>(null);

  useEffect(() => {
    // Set client flag to prevent hydration mismatch
    setIsClient(true);

    // Initialize audio components
    audioRecorderRef.current = new AudioRecorder();
    audioPlayerRef.current = new AudioPlayer();

    return () => {
      audioPlayerRef.current?.cleanup();
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
  };

  const endCall = () => {
    setIsCallActive(false);
    setCallStartTime(null);
    audioPlayerRef.current?.stopAudio();
    setConversationState(prev => ({
      ...prev,
      isRecording: false,
      isProcessing: false,
      isPlaying: false,
    }));
  };

  const handleStartRecording = async () => {
    try {
      setConversationState(prev => ({ ...prev, error: null }));
      await audioRecorderRef.current?.startRecording();
      setConversationState(prev => ({ ...prev, isRecording: true }));
    } catch (error) {
      setConversationState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to start recording',
      }));
    }
  };

  const handleStopRecording = async () => {
    try {
      if (!audioRecorderRef.current) return;

      const audioBlob = await audioRecorderRef.current.stopRecording();
      setConversationState(prev => ({ 
        ...prev, 
        isRecording: false, 
        isProcessing: true 
      }));

      // Validate API keys are available
      const validation = validateApiKeys();
      if (!validation.isValid) {
        throw new Error(`API keys not configured: ${validation.missingKeys.join(', ')}`);
      }

      // Transcribe audio
      const transcription = await transcribeAudio(audioBlob);
      
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

      // Get chat response with enhanced context
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
      await audioPlayerRef.current?.playAudio(audioBuffer);

      setConversationState(prev => ({ ...prev, isPlaying: false }));

    } catch (error) {
      setConversationState(prev => ({
        ...prev,
        isRecording: false,
        isProcessing: false,
        isPlaying: false,
        error: error instanceof Error ? error.message : 'An error occurred',
      }));
    }
  };

  const handleStopPlayback = () => {
    audioPlayerRef.current?.stopAudio();
    setConversationState(prev => ({ ...prev, isPlaying: false }));
  };

  const handleDismissError = () => {
    setConversationState(prev => ({ ...prev, error: null }));
  };

  const canStartCall = emailData?.salespersonName && emailData?.clientName;

  // Prevent hydration mismatch by not rendering until client-side
  if (!isClient) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-teal-50 dark:from-slate-900 dark:via-blue-900 dark:to-teal-900">
      <div className="container mx-auto p-6 max-w-6xl">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-teal-600 bg-clip-text text-transparent mb-2">
            Strategic Cold Call Voice Agent
          </h1>
          <p className="text-lg text-muted-foreground">
            AI-powered relationship-building conversations focused on discovering target audience and location
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
                    Start Strategic Call
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
            <CardDescription>
              {!canStartCall 
                ? 'Configure your email details first to personalize the conversation'
                : isCallActive 
                  ? `Active call: ${emailData?.salespersonName} → ${emailData?.clientName}` 
                  : `Ready to call ${emailData?.clientName} as ${emailData?.salespersonName}`
              }
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
              <VoiceControls
                isRecording={conversationState.isRecording}
                isProcessing={conversationState.isProcessing}
                isPlaying={conversationState.isPlaying}
                onStartRecording={handleStartRecording}
                onStopRecording={handleStopRecording}
                onStopPlayback={handleStopPlayback}
              />

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

              {/* Conversation Tips */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Conversation Tips</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm text-muted-foreground">
                  <p>• Start with warm greeting and email reference</p>
                  <p>• Ask about their business naturally</p>
                  <p>• Focus on understanding their market</p>
                  <p>• Build rapport before pitching solutions</p>
                  <p>• Listen actively and show genuine interest</p>
                </CardContent>
              </Card>
            </div>
          </div>
        ) : (
          <Card className="text-center py-12">
            <CardContent>
              <Phone className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-xl font-semibold mb-2">
                {canStartCall ? 'Ready for Strategic Cold Call' : 'Configure Your Cold Call'}
              </h3>
              <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                {canStartCall 
                  ? `Start your strategic call as ${emailData?.salespersonName} to ${emailData?.clientName}. Focus on building rapport and discovering their target audience and market.`
                  : 'Configure your email details above to create a personalized conversation experience with strategic goals.'
                }
              </p>
              {canStartCall && (
                <Button
                  onClick={startCall}
                  size="lg"
                  className="bg-gradient-to-r from-blue-600 to-teal-600 hover:from-blue-700 hover:to-teal-700 text-white"
                >
                  <Phone className="h-5 w-5 mr-2" />
                  Start Strategic Call
                </Button>
              )}
            </CardContent>
          </Card>
        )}

        {/* Footer */}
        <div className="mt-12 text-center text-sm text-muted-foreground">
          <p>Powered by OpenAI GPT-4, Whisper API, and ElevenLabs Voice Synthesis</p>
        </div>
      </div>
    </div>
  );
}