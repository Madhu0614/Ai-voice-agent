'use client';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Mic, MicOff, Square, Play, Pause } from 'lucide-react';

interface VoiceControlsProps {
  isRecording: boolean;
  isProcessing: boolean;
  isPlaying: boolean;
  onStartRecording: () => void;
  onStopRecording: () => void;
  onStopPlayback: () => void;
}

export function VoiceControls({
  isRecording,
  isProcessing,
  isPlaying,
  onStartRecording,
  onStopRecording,
  onStopPlayback,
}: VoiceControlsProps) {
  const getStatusBadge = () => {
    if (isRecording) {
      return <Badge variant="destructive" className="animate-pulse">Recording</Badge>;
    }
    if (isProcessing) {
      return <Badge variant="secondary">Processing</Badge>;
    }
    if (isPlaying) {
      return <Badge variant="default">Playing</Badge>;
    }
    return <Badge variant="outline">Ready</Badge>;
  };

  return (
    <div className="border rounded-lg p-6 bg-card">
      <div className="text-center space-y-4">
        <div className="flex justify-center">
          {getStatusBadge()}
        </div>
        
        <div className="flex justify-center">
          {!isRecording ? (
            <Button
              size="lg"
              onClick={onStartRecording}
              disabled={isProcessing || isPlaying}
              className="h-16 w-16 rounded-full bg-gradient-to-r from-blue-500 to-teal-500 hover:from-blue-600 hover:to-teal-600 text-white shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105"
            >
              <Mic className="h-6 w-6" />
            </Button>
          ) : (
            <Button
              size="lg"
              variant="destructive"
              onClick={onStopRecording}
              className="h-16 w-16 rounded-full animate-pulse"
            >
              <Square className="h-6 w-6" />
            </Button>
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
            Stop Playback
          </Button>
        )}
        
        <div className="text-sm text-muted-foreground max-w-xs mx-auto">
          {isRecording && "Speak now... Click stop when finished"}
          {isProcessing && "Processing your message..."}
          {isPlaying && "Playing agent response..."}
          {!isRecording && !isProcessing && !isPlaying && "Click the microphone to start speaking"}
        </div>
      </div>
    </div>
  );
}