export interface EmailData {
  salespersonName: string;
  clientName: string;
  companyName?: string;
  emailContent: string;
  hasClientReply: boolean;
  clientReplyContent?: string;
}

export function parseEmailData(emailContent: string): EmailData {
  const lines = emailContent.split('\n').map(line => line.trim());
  
  let salespersonName = '';
  let clientName = '';
  let companyName = '';
  let hasClientReply = false;
  let clientReplyContent = '';

  // Check for client reply indicators
  const replyIndicators = [
    'from:',
    'reply:',
    '---',
    'on ',
    'wrote:',
    '> ',
    'thanks for',
    'thank you for'
  ];

  const replyStartIndex = lines.findIndex(line => 
    replyIndicators.some(indicator => 
      line.toLowerCase().includes(indicator.toLowerCase())
    )
  );

  if (replyStartIndex !== -1) {
    hasClientReply = true;
    // Extract client reply content
    const replyLines = lines.slice(replyStartIndex);
    clientReplyContent = replyLines
      .filter(line => 
        !line.toLowerCase().includes('from:') &&
        !line.toLowerCase().includes('sent:') &&
        !line.toLowerCase().includes('to:') &&
        !line.toLowerCase().includes('subject:') &&
        !line.includes('@') &&
        line.length > 3
      )
      .join(' ')
      .trim()
      .substring(0, 200); // Limit length
  }

  // Extract client name from "To:" field or greeting
  const toLine = lines.find(line => 
    line.toLowerCase().startsWith('to:') || 
    line.toLowerCase().startsWith('dear ') ||
    line.toLowerCase().includes('hello ') ||
    line.toLowerCase().includes('hi ')
  );
  
  if (toLine) {
    const nameMatch = toLine.match(/(?:to:|dear|hello|hi)\s*([^,\n<@]+)/i);
    if (nameMatch) {
      clientName = nameMatch[1].trim();
      clientName = clientName.replace(/^(mr\.?|mrs\.?|ms\.?|dr\.?)\s*/i, '');
    }
  }

  // If no client name found in greeting, try to extract from reply
  if (!clientName && hasClientReply) {
    const fromLine = lines.find(line => line.toLowerCase().startsWith('from:'));
    if (fromLine) {
      const nameMatch = fromLine.match(/from:\s*([^<@\n]+)/i);
      if (nameMatch) {
        clientName = nameMatch[1].trim();
      }
    }
  }

  // Extract salesperson name from signature
  const regardsIndex = lines.findIndex(line => 
    line.toLowerCase().includes('regards') ||
    line.toLowerCase().includes('sincerely') ||
    line.toLowerCase().includes('best') ||
    line.toLowerCase().includes('thank you')
  );

  if (regardsIndex !== -1 && regardsIndex < lines.length - 1) {
    for (let i = regardsIndex + 1; i < Math.min(regardsIndex + 4, lines.length); i++) {
      const line = lines[i];
      if (line && !line.includes('@') && !line.toLowerCase().includes('phone') && 
          !line.toLowerCase().includes('email') && line.length > 2 && line.length < 50) {
        salespersonName = line.trim();
        break;
      }
    }
  }

  // Extract company name
  const companyPatterns = [
    /from\s+([^<@\n]+)/i,
    /at\s+([^<@\n]+)/i,
    /@([^.\s]+)/,
  ];

  for (const pattern of companyPatterns) {
    const match = emailContent.match(pattern);
    if (match) {
      companyName = match[1].trim();
      break;
    }
  }

  return {
    salespersonName: salespersonName || 'Sales Representative',
    clientName: clientName || 'Valued Client',
    companyName: companyName || 'Retl Direct',
    emailContent,
    hasClientReply,
    clientReplyContent,
  };
}