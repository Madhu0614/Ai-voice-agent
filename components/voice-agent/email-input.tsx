'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Mail, User, Building, Check, Edit3, MessageSquare } from 'lucide-react';
import { EmailData, parseEmailData } from '@/lib/email-parser';

interface EmailInputProps {
  onEmailParsed: (emailData: EmailData) => void;
  emailData: EmailData | null;
}

export function EmailInput({ onEmailParsed, emailData }: EmailInputProps) {
  const [emailContent, setEmailContent] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  
  // Editable fields
  const [editableSalesperson, setEditableSalesperson] = useState('');
  const [editableClient, setEditableClient] = useState('');
  const [editableCompany, setEditableCompany] = useState('');

  const handleParseEmail = () => {
    if (!emailContent.trim()) return;
    
    setIsProcessing(true);
    setTimeout(() => {
      const parsedData = parseEmailData(emailContent);
      setEditableSalesperson(parsedData.salespersonName);
      setEditableClient(parsedData.clientName);
      setEditableCompany(parsedData.companyName || '');
      onEmailParsed(parsedData);
      setIsProcessing(false);
    }, 500);
  };

  const handleSaveEdits = () => {
    if (emailData) {
      const updatedData: EmailData = {
        ...emailData,
        salespersonName: editableSalesperson,
        clientName: editableClient,
        companyName: editableCompany,
      };
      onEmailParsed(updatedData);
      setIsEditing(false);
    }
  };

  const handleStartEditing = () => {
    if (emailData) {
      setEditableSalesperson(emailData.salespersonName);
      setEditableClient(emailData.clientName);
      setEditableCompany(emailData.companyName || '');
      setIsEditing(true);
    }
  };

  const handleClear = () => {
    setEmailContent('');
    setIsEditing(false);
    onEmailParsed({
      salespersonName: '',
      clientName: '',
      companyName: '',
      emailContent: '',
      hasClientReply: false,
      clientReplyContent: '',
    });
  };

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mail className="h-5 w-5 text-blue-500" />
          Email Configuration
        </CardTitle>
        <CardDescription>
          Paste your cold email (including any client replies) to personalize the conversation
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!emailData?.emailContent ? (
          <>
            <Textarea
              placeholder="Paste your cold email here (including any client replies)...

Example:
To: John Smith <john@company.com>
Subject: Boost Your Retail Operations

Dear John,

I hope this email finds you well. I'm reaching out because...

Best regards,
Sarah Johnson
Retl Direct

---

From: John Smith <john@company.com>
Hi Sarah,

Thanks for reaching out. We're always looking to improve our operations. 
What exactly does Retl Direct offer?

Best,
John"
              value={emailContent}
              onChange={(e) => setEmailContent(e.target.value)}
              className="min-h-[250px] resize-none"
            />
            <div className="flex gap-2">
              <Button 
                onClick={handleParseEmail}
                disabled={!emailContent.trim() || isProcessing}
                className="bg-gradient-to-r from-blue-600 to-teal-600 hover:from-blue-700 hover:to-teal-700"
              >
                {isProcessing ? 'Processing...' : 'Parse Email'}
              </Button>
              {emailContent && (
                <Button variant="outline" onClick={() => setEmailContent('')}>
                  Clear
                </Button>
              )}
            </div>
          </>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-green-600">
                <Check className="h-4 w-4" />
                <span className="font-medium">Email parsed successfully!</span>
                {emailData.hasClientReply && (
                  <Badge variant="secondary" className="ml-2">
                    <MessageSquare className="h-3 w-3 mr-1" />
                    Client Reply Detected
                  </Badge>
                )}
              </div>
              
              {!isEditing && (
                <Button variant="outline" size="sm" onClick={handleStartEditing}>
                  <Edit3 className="h-4 w-4 mr-1" />
                  Edit Details
                </Button>
              )}
            </div>
            
            {isEditing ? (
              <div className="space-y-4 p-4 border rounded-lg bg-muted/50">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="salesperson">Your Name (Salesperson)</Label>
                    <Input
                      id="salesperson"
                      value={editableSalesperson}
                      onChange={(e) => setEditableSalesperson(e.target.value)}
                      placeholder="Enter salesperson name"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="client">Client Name</Label>
                    <Input
                      id="client"
                      value={editableClient}
                      onChange={(e) => setEditableClient(e.target.value)}
                      placeholder="Enter client name"
                    />
                  </div>
                </div>
                
                <div>
                  <Label htmlFor="company">Your Company</Label>
                  <Input
                    id="company"
                    value={editableCompany}
                    onChange={(e) => setEditableCompany(e.target.value)}
                    placeholder="Enter company name"
                  />
                </div>
                
                <div className="flex gap-2">
                  <Button onClick={handleSaveEdits}>
                    Save Changes
                  </Button>
                  <Button variant="outline" onClick={() => setIsEditing(false)}>
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex items-center gap-2 p-3 bg-blue-50 dark:bg-blue-950 rounded-lg">
                  <User className="h-4 w-4 text-blue-500" />
                  <div>
                    <p className="text-xs text-muted-foreground">You are</p>
                    <p className="font-medium">{emailData.salespersonName}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-950 rounded-lg">
                  <User className="h-4 w-4 text-green-500" />
                  <div>
                    <p className="text-xs text-muted-foreground">Calling</p>
                    <p className="font-medium">{emailData.clientName}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-2 p-3 bg-purple-50 dark:bg-purple-950 rounded-lg">
                  <Building className="h-4 w-4 text-purple-500" />
                  <div>
                    <p className="text-xs text-muted-foreground">Company</p>
                    <p className="font-medium">{emailData.companyName || 'Not specified'}</p>
                  </div>
                </div>
              </div>
            )}
            
            {emailData.hasClientReply && emailData.clientReplyContent && (
              <div className="p-4 bg-amber-50 dark:bg-amber-950 rounded-lg border border-amber-200 dark:border-amber-800">
                <div className="flex items-center gap-2 mb-2">
                  <MessageSquare className="h-4 w-4 text-amber-600" />
                  <span className="font-medium text-amber-800 dark:text-amber-200">Client's Reply</span>
                </div>
                <p className="text-sm text-amber-700 dark:text-amber-300 italic">
                  "{emailData.clientReplyContent}"
                </p>
                <p className="text-xs text-amber-600 dark:text-amber-400 mt-2">
                  The AI will reference this reply during the conversation
                </p>
              </div>
            )}
            
            <Button variant="outline" onClick={handleClear} size="sm">
              Change Email
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}