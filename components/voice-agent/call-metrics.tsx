'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock, MessageSquare, Mic, Volume2 } from 'lucide-react';
import { Message } from '@/types/conversation';

interface CallMetricsProps {
  messages: Message[];
  callStartTime: Date | null;
  isActive: boolean;
}

export function CallMetrics({ messages, callStartTime, isActive }: CallMetricsProps) {
  const calculateCallDuration = () => {
    if (!callStartTime) return '00:00';
    const now = new Date();
    const duration = Math.floor((now.getTime() - callStartTime.getTime()) / 1000);
    const minutes = Math.floor(duration / 60);
    const seconds = duration % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const userMessages = messages.filter(m => m.type === 'user').length;
  const agentMessages = messages.filter(m => m.type === 'agent').length;

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Clock className="h-4 w-4 text-blue-500" />
            Call Duration
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {isActive ? calculateCallDuration() : '00:00'}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <MessageSquare className="h-4 w-4 text-green-500" />
            Total Messages
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{messages.length}</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Mic className="h-4 w-4 text-purple-500" />
            Your Messages
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{userMessages}</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Volume2 className="h-4 w-4 text-orange-500" />
            Agent Responses
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{agentMessages}</div>
        </CardContent>
      </Card>
    </div>
  );
}