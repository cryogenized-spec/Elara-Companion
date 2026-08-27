import React from 'react';

const LazyCanvasPanel = React.lazy(async () => {
  const module = await import('./CanvasPanel');
  return { default: module.CanvasPanel };
});

export const CanvasPanel = LazyCanvasPanel;
