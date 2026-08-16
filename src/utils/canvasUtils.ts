import { CanvasData } from '../types';

export function extractCanvases(text: string): { cleanContent: string; canvases: CanvasData[] } {
  if (!text) return { cleanContent: '', canvases: [] };

  const canvases: CanvasData[] = [];
  // Matches <canvas title="...">...</canvas> or <canvas name="...">...</canvas> or plain <canvas>...</canvas>
  const regex = /<canvas(?:\s+(?:title|name)=["']([^"']*)["'])?\s*>([\s\S]*?)<\/canvas>/gi;
  
  let match;
  let cleanContent = text;
  
  while ((match = regex.exec(text)) !== null) {
    const title = (match[1] || 'Canvas Document').trim();
    const content = (match[2] || '').trim();
    if (content.length > 0) {
      canvases.push({
        title: title || 'Canvas Document',
        content,
      });
    }
  }
  
  cleanContent = cleanContent.replace(regex, '').trim();
  
  // Clean up any remaining trailing unclosed <canvas ...> tag if it was cut off
  cleanContent = cleanContent.replace(/<canvas(?:\s+(?:title|name)=["'][^"']*["'])?\s*$/i, '').trim();

  return { cleanContent, canvases };
}
