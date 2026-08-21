import React from 'react';
import type { CanvasData, Message } from '../types';
import {
  UnifiedChatMessage,
  getAssistantBackgroundClasses,
  getUserBubbleClasses,
  EmailDraftButton,
} from './UnifiedChatMessage';

export { getAssistantBackgroundClasses, getUserBubbleClasses, EmailDraftButton } from './UnifiedChatMessage';

export interface ChatMessageProps {
  message: Message;
  isLast: boolean;
  isStreaming: boolean;
  portraitImage?: string | null;
  fontSize?: number;
  textBackground?: string;
  isLastUserMessage?: boolean;
  onRegenerate?: () => void;
  onEditAndResend?: (messageId: string, newContent: string) => void;
  onRetry?: () => void;
  onCompleteResponse?: () => void;
  onOpenSettings?: () => void;
  onOpenCanvas?: (canvas: CanvasData) => void;
  onOpenArtifact?: (artifactId: string) => void;
}

export const ChatMessage: React.FC<ChatMessageProps> = (props) => <UnifiedChatMessage {...props} />;
