import { CanvasData } from '../types';

export function extractCanvases(text: string): { cleanContent: string; canvases: CanvasData[] } {
  const canvases: CanvasData[] = [];
  const regex = /<canvas title="([^"]+)">([\s\S]*?)<\/canvas>/gi;
  
  let match;
  let cleanContent = text;
  
  while ((match = regex.exec(text)) !== null) {
    canvases.push({
      title: match[1],
      content: match[2].trim(),
    });
  }
  
  cleanContent = cleanContent.replace(regex, '').trim();
  
  return { cleanContent, canvases };
}
