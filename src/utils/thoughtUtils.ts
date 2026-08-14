import { ThoughtStep } from '../types';

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

  // Regex to match complete <thought>...</thought> or <think>...</think>
  const thoughtTagRegex = /<(?:thought|think)>([\s\S]*?)<\/(?:thought|think)>/gi;
  let match;
  while ((match = thoughtTagRegex.exec(rawText)) !== null) {
    if (match[1]) {
      combinedThoughts += (combinedThoughts ? '\n\n' : '') + match[1].trim();
    }
  }
  cleanContent = cleanContent.replace(thoughtTagRegex, '').trim();

  // Check for open/unclosed <thought> or <think> tag during active streaming
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

/**
 * Parses raw thought text into structured sequential ThoughtStep objects.
 */
export function parseThoughtSteps(rawThoughts: string): ThoughtStep[] {
  if (!rawThoughts || !rawThoughts.trim()) return [];

  const text = rawThoughts.trim();
  const steps: ThoughtStep[] = [];

  // Split by numbered list pattern: e.g., "1. Title", "Step 1: Title", or "### Title" or double newlines
  const sectionSplitter = /(?:^|\n)(?:(?:\d+[\.\)]\s+)|(?:Step\s+\d+[:\.\-]\s*)|(?:###?\s+)|(?:[\*\-]\s+))/g;
  
  const rawSections = text.split(sectionSplitter).filter(s => s.trim().length > 0);

  if (rawSections.length > 1) {
    rawSections.forEach((section, idx) => {
      const lines = section.trim().split('\n').map(l => l.trim()).filter(Boolean);
      if (lines.length === 0) return;

      const firstLine = lines[0].replace(/^[\*\#\-\_\`\s]+|[\*\#\-\_\`\s]+$/g, '').trim();
      const rest = lines.slice(1).join('\n').trim();

      // If firstLine is very long, split by first sentence
      let title = firstLine;
      let summary = rest;

      if (!summary && firstLine.length > 80) {
        const sentenceMatch = firstLine.match(/^([^\.\?\!]+[\.\?\!])\s*(.*)$/);
        if (sentenceMatch) {
          title = sentenceMatch[1].trim();
          summary = sentenceMatch[2].trim();
        }
      }

      if (!summary) {
        summary = title;
      }

      steps.push({
        id: `step_${idx + 1}_${Date.now()}`,
        step_title: title || `Reasoning Phase ${idx + 1}`,
        summary: summary || title,
        timestamp: Date.now(),
      });
    });
  } else {
    // Break into paragraphs or sentences if no structured markers exist
    const paragraphs = text.split(/\n\s*\n/).map(p => p.trim()).filter(Boolean);
    if (paragraphs.length > 1) {
      paragraphs.forEach((p, idx) => {
        const lines = p.split('\n').map(l => l.trim()).filter(Boolean);
        const title = lines[0].replace(/^[\*\#\-\_\`\s]+|[\*\#\-\_\`\s]+$/g, '').trim();
        const summary = lines.length > 1 ? lines.slice(1).join(' ') : p;

        steps.push({
          id: `para_${idx + 1}`,
          step_title: title.length > 70 ? `${title.slice(0, 67)}...` : title,
          summary: summary,
          timestamp: Date.now(),
        });
      });
    } else {
      // Single continuous thought text
      const sentences = text.split(/(?<=[.?!])\s+/).filter(Boolean);
      if (sentences.length > 2) {
        // Group into 2 or 3 steps
        const step1 = sentences.slice(0, Math.ceil(sentences.length / 2)).join(' ');
        const step2 = sentences.slice(Math.ceil(sentences.length / 2)).join(' ');
        
        steps.push({
          id: 'thought_step_1',
          step_title: sentences[0].replace(/^[\*\#\-\_\`\s]+|[\*\#\-\_\`\s]+$/g, ''),
          summary: step1,
          timestamp: Date.now(),
        });
        steps.push({
          id: 'thought_step_2',
          step_title: (sentences[Math.ceil(sentences.length / 2)] || 'Synthesizing Response').replace(/^[\*\#\-\_\`\s]+|[\*\#\-\_\`\s]+$/g, ''),
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

  return steps;
}

/**
 * Extracts a concise, single active thought sentence for real-time live display in the inline bar.
 */
export function getActiveThoughtSentence(rawThoughts: string, fallback = 'Analyzing context and formulating response...'): string {
  if (!rawThoughts || !rawThoughts.trim()) return fallback;

  const clean = rawThoughts.replace(/<[^>]+>/g, '').trim();
  // Get the last non-empty line or sentence
  const lines = clean.split('\n').map(l => l.trim()).filter(Boolean);
  if (lines.length === 0) return fallback;

  const lastLine = lines[lines.length - 1];
  // Remove markdown formatting like **, *, #, -
  const cleanLine = lastLine.replace(/^[\d\.\-\*\#\s]+/, '').replace(/[\*\_\`]/g, '').trim();
  
  if (cleanLine.length > 110) {
    const sentences = cleanLine.split(/(?<=[.?!])\s+/);
    return sentences[sentences.length - 1]?.trim() || `${cleanLine.slice(0, 107)}...`;
  }

  return cleanLine || fallback;
}
