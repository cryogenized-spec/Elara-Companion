export interface CanvasHeading {
  level: number;
  text: string;
  line: number;
}

export const extractCanvasHeadings = (content: string): CanvasHeading[] =>
  content.split('\n').flatMap((line, index) => {
    const match = /^(#{1,4})\s+(.+?)\s*$/.exec(line);
    if (!match) return [];
    return [{
      level: match[1].length,
      text: match[2].replace(/[*_`]/g, ''),
      line: index,
    }];
  });

export const findNextMatch = (content: string, query: string, start = 0): number => {
  const needle = query.trim().toLowerCase();
  if (!needle) return -1;
  return content.toLowerCase().indexOf(needle, Math.max(0, start));
};

export const findPreviousMatch = (content: string, query: string, start: number): number => {
  const needle = query.trim().toLowerCase();
  if (!needle) return -1;
  return content.toLowerCase().lastIndexOf(needle, Math.max(0, start));
};
