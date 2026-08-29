import React from 'react';
import type { CanvasData, Message } from '../types';
import {
  UnifiedChatMessage,
  getAssistantBackgroundClasses,
  getUserBubbleClasses,
  EmailDraftButton,
} from './UnifiedChatMessage';
import { ScrollToBottomButton } from './ScrollToBottomButton';

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

function areHistoricalPropsEqual(previous: ChatMessageProps, next: ChatMessageProps): boolean {
  if (previous.isLast !== next.isLast || previous.isStreaming !== next.isStreaming) return false;
  if (previous.message !== next.message) return false;
  if (previous.portraitImage !== next.portraitImage) return false;
  if (previous.fontSize !== next.fontSize) return false;
  if (previous.textBackground !== next.textBackground) return false;
  if (previous.isLastUserMessage !== next.isLastUserMessage) return false;

  if (next.isLast) {
    return (
      previous.onRegenerate === next.onRegenerate &&
      previous.onEditAndResend === next.onEditAndResend &&
      previous.onRetry === next.onRetry &&
      previous.onCompleteResponse === next.onCompleteResponse &&
      previous.onOpenSettings === next.onOpenSettings &&
      previous.onOpenCanvas === next.onOpenCanvas &&
      previous.onOpenArtifact === next.onOpenArtifact
    );
  }
  return true;
}

export const ChatMessage = React.memo(
  (props: ChatMessageProps) => (
    <>
      <UnifiedChatMessage {...props} />
      {props.isLast && <ScrollToBottomButton scrollContainerRef={{ current: document.querySelector<HTMLDivElement>('.touch-scroll') }} />}
    </>
  ),
  areHistoricalPropsEqual,
);