'use client';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Mic, MicOff, Square, Play, Pause, Volume2, VolumeX } from 'lucide-react';

interface VoiceControlsProps {
  isRecording: boolean;
  isProcessing: boolean;
  isPlaying: boolean;
  onStartRecording: () => void;
  onStopRecording: () => void;
  onStopPlayback: () => void;
  isListening?: boolean;
  currentVolume?: number;
}

export function VoiceControls({
  isRecording,
  isProcessing,
  isPlaying,
  onStartRecording,
  onStopRecording,
  onStopPlayback,
  isListening = false,
  currentVolume = 0,
}: VoiceControlsProps) {
  const getStatusBadge = () => {
    if (isPlaying) {
      return <Badge variant="default" className="animate-pulse">Agent Speaking</Badge>;
    }
    if (isProcessing) {
      return <Badge variant="secondary">Processing</Badge>;
    }
    if (isListening) {
      return <Badge variant="default" className="bg-green-600">Listening</Badge>;
    }
    return <Badge variant="outline">Ready</Badge>;
  };

  const getVolumeIcon = () => {
    if (currentVolume > 30) return <Volume2 className="h-4 w-4" />;
    if (currentVolume > 10) return <Volume2 className="h-4 w-4 opacity-70" />;
    return <VolumeX className="h-4 w-4 opacity-50" />;
  };

  return (
    <div className="border rounded-lg p-6 bg-card">
      <div className="text-center space-y-4">
        <div className="flex justify-center">
          {getStatusBadge()}
        </div>
        
        {/* Volume Indicator */}
        {isListening && (
          <div className="flex items-center justify-center gap-2">
            {getVolumeIcon()}
            <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-green-400 to-green-600 transition-all duration-100"
                style={{ width: `${Math.min(100, (currentVolume / 50) * 100)}%` }}
              />
            </div>
          </div>
        )}
        
        <div className="flex justify-center">
          {isListening ? (
            <div className="h-16 w-16 rounded-full bg-gradient-to-r from-green-500 to-emerald-500 flex items-center justify-center animate-pulse shadow-lg">
              <Mic className="h-6 w-6 text-white" />
            </div>
          ) : isProcessing ? (
            <div className="h-16 w-16 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center animate-spin shadow-lg">
              <div className="h-4 w-4 bg-white rounded-full"></div>
            </div>
          ) : isPlaying ? (
            <div className="h-16 w-16 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center animate-pulse shadow-lg">
              <Volume2 className="h-6 w-6 text-white" />
            </div>
          ) : (
            <div className="h-16 w-16 rounded-full bg-gradient-to-r from-gray-400 to-gray-500 flex items-center justify-center shadow-lg">
              <MicOff className="h-6 w-6 text-white" />
            </div>
          )}
        </div>
        
        {isPlaying && (
          <Button
            size="sm"
            variant="outline"
            onClick={onStopPlayback}
            className="flex items-center gap-2"
          >
            <Pause className="h-4 w-4" />
            Interrupt Agent
          </Button>
        )}
        
        <div className="text-sm text-muted-foreground max-w-xs mx-auto">
          {isPlaying && "Agent is speaking... Interrupt anytime by talking"}
          {isProcessing && "Processing your message..."}
          {isListening && "Listening... Speak naturally"}
          {!isListening && !isProcessing && !isPlaying && "Real-time conversation ready"}
        </div>
      </div>
    </div>
  );
}