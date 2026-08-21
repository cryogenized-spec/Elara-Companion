import { ThoughtStep } from '../types';
import { syncLiveThoughtSteps } from '../lib/thinkingLiveRuntime';

/**
 * Cleanly extracts thoughts and cleans dialogue content if tags like <thought> or <think> exist.
 */
export function extractThoughtsAndContent(rawText: string, streamedThoughts = ''): {
  cleanContent: string;
  combinedThoughts: string;
  isInsideThoughtTag: boolean;
} {
  let combinedThoughts = streamedThoughts || '';
  let cleanContent = rawText || '';
  let isInsideThoughtTag = false;

  const thoughtTagRegex = /<(?:thought|think)>([\s\S]*?)<\/(?:thought|think)>/gi;
  let match;
  while ((match = thoughtTagRegex.exec(rawText)) !== null) {
    if (match[1]) combinedThoughts += (combinedThoughts ? '\n\n' : '') + match[1].trim();
  }
  cleanContent = cleanContent.replace(thoughtTagRegex, '').trim();

  const openTagMatch = cleanContent.match(/<(?:thought|think)>([\s\S]*)$/i);
  if (openTagMatch) {
    isInsideThoughtTag = true;
    const partialThought = openTagMatch[1];
    combinedThoughts += (combinedThoughts ? '\n\n' : '') + partialThought.trim();
    cleanContent = cleanContent.substring(0, openTagMatch.index).trim();
  }

  return {
    cleanContent,
    combinedThoughts: combinedThoughts.trim(),
    isInsideThoughtTag,
  };
}

export function parseThoughtSteps(rawThoughts: string): ThoughtStep[] {
  if (!rawThoughts || !rawThoughts.trim()) return [];

  const text = rawThoughts.trim();
  const steps: ThoughtStep[] = [];
  const sectionSplitter = /(?:^|\n)(?:(?:\d+[\.\)]\s+)|(?:Step\s+\d+[:\.\-]\s*)|(?:###?\s+)|(?:[\*\-]\s+))/g;
  const rawSections = text.split(sectionSplitter).filter(s => s.trim().length > 0);

  if (rawSections.length > 1) {
    rawSections.forEach((section, idx) => {
      const lines = section.trim().split('\n').map(l => l.trim()).filter(Boolean);
      if (lines.length === 0) return;
      const firstLine = lines[0].replace(/^[\*\#\-\_\`\s]+|[\*\#\-\_\`\s]+$/g, '').trim();
      const rest = lines.slice(1).join('\n').trim();
      let title = firstLine;
      let summary = rest;
      if (!summary && firstLine.length > 80) {
        const sentenceMatch = firstLine.match(/^([^\.\?\!]+[\.\?\!])\s*(.*)$/);
        if (sentenceMatch) {
          title = sentenceMatch[1].trim();
          summary = sentenceMatch[2].trim();
        }
      }
      if (!summary) summary = title;
      steps.push({
        id: `step_${idx + 1}_${Date.now()}`,
        step_title: title || `Reasoning Phase ${idx + 1}`,
        summary: summary || title,
        timestamp: Date.now(),
      });
    });
  } else {
    const paragraphs = text.split(/\n\s*\n/).map(p => p.trim()).filter(Boolean);
    if (paragraphs.length > 1) {
      paragraphs.forEach((p, idx) => {
        const lines = p.split('\n').map(l => l.trim()).filter(Boolean);
        const title = lines[0].replace(/^[\*\#\-\_\`\s]+|[\*\#\-\_\`\s]+$/g, '').trim();
        const summary = lines.length > 1 ? lines.slice(1).join(' ') : p;
        steps.push({
          id: `para_${idx + 1}`,
          step_title: title.length > 70 ? `${title.slice(0, 67)}...` : title,
          summary,
          timestamp: Date.now(),
        });
      });
    } else {
      const sentences = text.split(/(?<=[.?!])\s+/).filter(Boolean);
      if (sentences.length > 2) {
        const midpoint = Math.ceil(sentences.length / 2);
        const step1 = sentences.slice(0, midpoint).join(' ');
        const step2 = sentences.slice(midpoint).join(' ');
        steps.push({
          id: 'thought_step_1',
          step_title: sentences[0].replace(/^[\*\#\-\_\`\s]+|[\*\#\-\_\`\s]+$/g, ''),
          summary: step1,
          timestamp: Date.now(),
        });
        steps.push({
          id: 'thought_step_2',
          step_title: (sentences[midpoint] || 'Synthesizing Response').replace(/^[\*\#\-\_\`\s]+|[\*\#\-\_\`\s]+$/g, ''),
          summary: step2,
          timestamp: Date.now(),
        });
      } else {
        steps.push({
          id: 'thought_step_primary',
          step_title: sentences[0] ? sentences[0].replace(/^[\*\#\-\_\`\s]+|[\*\#\-\_\`\s]+$/g, '') : 'Cognitive Synthesis',
          summary: text,
          timestamp: Date.now(),
        });
      }
    }
  }

  syncLiveThoughtSteps(steps);
  return steps;
}

export function getActiveThoughtSentence(rawThoughts: string, fallback = 'Analyzing context and formulating response...'): string {
  if (!rawThoughts || !rawThoughts.trim()) return fallback;
  const clean = rawThoughts.replace(/<[^>]+>/g, '').trim();
  const lines = clean.split('\n').map(l => l.trim()).filter(Boolean);
  if (lines.length === 0) return fallback;
  const lastLine = lines[lines.length - 1];
  const cleanLine = lastLine.replace(/^[\d\.\-\*\#\s]+/, '').replace(/[\*\_\`]/g, '').trim();
  if (cleanLine.length > 110) {
    const sentences = cleanLine.split(/(?<=[.?!])\s+/);
    return sentences[sentences.length - 1]?.trim() || `${cleanLine.slice(0, 107)}...`;
  }
  return cleanLine || fallback;
}
