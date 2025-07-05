'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Key, ExternalLink, AlertTriangle, CheckCircle, Eye, EyeOff } from 'lucide-react';
import { validateApiKeys } from '@/lib/config';

interface ApiSetupProps {
  onApiKeysConfigured: () => void;
}

export function ApiSetup({ onApiKeysConfigured }: ApiSetupProps) {
  const [openaiKey, setOpenaiKey] = useState('');
  const [elevenlabsKey, setElevenlabsKey] = useState('');
  const [showKeys, setShowKeys] = useState({ openai: false, elevenlabs: false });
  const [isValidating, setIsValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<{ isValid: boolean; missingKeys: string[] } | null>(null);

  useEffect(() => {
    // Check if keys are already configured
    const result = validateApiKeys();
    setValidationResult(result);
    if (result.isValid) {
      onApiKeysConfigured();
    }
  }, [onApiKeysConfigured]);

  const handleSaveKeys = () => {
    setIsValidating(true);
    
    // In a real application, you would save these to your backend or secure storage
    // For this demo, we'll store them in localStorage (not recommended for production)
    if (openaiKey) {
      localStorage.setItem('OPENAI_API_KEY', openaiKey);
    }
    if (elevenlabsKey) {
      localStorage.setItem('ELEVEN_API_KEY', elevenlabsKey);
    }

    // Simulate validation
    setTimeout(() => {
      const hasOpenAI = openaiKey || localStorage.getItem('OPENAI_API_KEY');
      const hasElevenLabs = elevenlabsKey || localStorage.getItem('ELEVEN_API_KEY');
      
      const missingKeys = [];
      if (!hasOpenAI) missingKeys.push('OpenAI API Key');
      if (!hasElevenLabs) missingKeys.push('ElevenLabs API Key');
      
      const result = { isValid: missingKeys.length === 0, missingKeys };
      setValidationResult(result);
      setIsValidating(false);
      
      if (result.isValid) {
        onApiKeysConfigured();
      }
    }, 1000);
  };

  const toggleKeyVisibility = (service: 'openai' | 'elevenlabs') => {
    setShowKeys(prev => ({ ...prev, [service]: !prev[service] }));
  };

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Key className="h-5 w-5 text-amber-500" />
          API Configuration Required
        </CardTitle>
        <CardDescription>
          Configure your OpenAI and ElevenLabs API keys to enable voice functionality
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>Important:</strong> This demo stores API keys in localStorage for simplicity. 
            In production, use secure environment variables or a backend service.
          </AlertDescription>
        </Alert>

        <div className="grid gap-6 md:grid-cols-2">
          {/* OpenAI Configuration */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">OpenAI API</h3>
              <Badge variant={validationResult?.missingKeys.includes('OpenAI API Key') ? 'destructive' : 'default'}>
                {validationResult?.missingKeys.includes('OpenAI API Key') ? 'Missing' : 'Configured'}
              </Badge>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="openai-key">API Key</Label>
              <div className="relative">
                <Input
                  id="openai-key"
                  type={showKeys.openai ? 'text' : 'password'}
                  placeholder="sk-..."
                  value={openaiKey}
                  onChange={(e) => setOpenaiKey(e.target.value)}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3"
                  onClick={() => toggleKeyVisibility('openai')}
                >
                  {showKeys.openai ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>
            
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => window.open('https://platform.openai.com/account/api-keys', '_blank')}
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Get OpenAI API Key
            </Button>
          </div>

          {/* ElevenLabs Configuration */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">ElevenLabs API</h3>
              <Badge variant={validationResult?.missingKeys.includes('ElevenLabs API Key') ? 'destructive' : 'default'}>
                {validationResult?.missingKeys.includes('ElevenLabs API Key') ? 'Missing' : 'Configured'}
              </Badge>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="elevenlabs-key">API Key</Label>
              <div className="relative">
                <Input
                  id="elevenlabs-key"
                  type={showKeys.elevenlabs ? 'text' : 'password'}
                  placeholder="sk_..."
                  value={elevenlabsKey}
                  onChange={(e) => setElevenlabsKey(e.target.value)}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3"
                  onClick={() => toggleKeyVisibility('elevenlabs')}
                >
                  {showKeys.elevenlabs ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>
            
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => window.open('https://elevenlabs.io/app/settings/api-keys', '_blank')}
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Get ElevenLabs API Key
            </Button>
          </div>
        </div>

        <div className="space-y-4">
          <Button
            onClick={handleSaveKeys}
            disabled={isValidating || (!openaiKey && !elevenlabsKey)}
            className="w-full"
          >
            {isValidating ? 'Validating...' : 'Save API Keys'}
          </Button>

          {validationResult && !validationResult.isValid && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Missing API keys: {validationResult.missingKeys.join(', ')}
              </AlertDescription>
            </Alert>
          )}

          {validationResult && validationResult.isValid && (
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                All API keys are configured! You can now use the voice agent.
              </AlertDescription>
            </Alert>
          )}
        </div>

        <div className="text-sm text-muted-foreground space-y-2">
          <p><strong>What you'll need:</strong></p>
          <ul className="list-disc list-inside space-y-1">
            <li>OpenAI API key for speech-to-text (Whisper) and chat completion (GPT-4)</li>
            <li>ElevenLabs API key for text-to-speech voice synthesis</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}