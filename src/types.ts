export type Role = 'user' | 'assistant' | 'model';

export interface ThoughtStep { id: string; step_title: string; summary: string; timestamp: number; }
export interface CanvasData { title: string; content: string; artifactId?: string; }
export interface Message {
  id: string; role: Role; content: string; timestamp: number; image?: string; isError?: boolean; errorMessage?: string;
  isStreaming?: boolean; isThinking?: boolean; thoughts?: ThoughtStep[]; rawThoughts?: string; currentThoughtSentence?: string;
  thoughtDurationMs?: number; canvases?: CanvasData[]; artifactIds?: string[]; backgroundJobId?: string;
}
export interface Folder { id: string; name: string; isExpanded?: boolean; }
export interface Conversation { id: string; title: string; createdAt: number; updatedAt: number; messages: Message[]; model?: string; temperature?: number; maxOutputTokens?: number; folderId?: string; }
