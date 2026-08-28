import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';

import { setupConfigRoutes } from './server/routes/config';
import { setupChatRoutes } from './server/routes/chat';
import { setupMemoryRoutes } from './server/routes/memory';
import { setupAudioRoutes } from './server/routes/audio';
import { setupWorkspaceRoutes } from './server/routes/workspace';
import { setupDiagnosticsRoutes } from './server/routes/diagnostics';
import { serverLockbox } from './server/services/lockbox';
import { requireBackendAccess, serverCors } from './server/middleware/serverAuth';

async function startServer() {
  const app = express();
  const PORT = Number(serverLockbox.runtime('PORT', '3000')) || 3000;

  app.use(serverCors);
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));

  // Public, read-only discovery endpoints.
  setupConfigRoutes(app);

  // AI, memory, audio, Workspace, and diagnostics mutation endpoints require
  // the explicit backend trust boundary in production. Local development remains usable.
  app.use('/api/chat', requireBackendAccess);
  app.use('/api/memory', requireBackendAccess);
  app.use('/api/audio', requireBackendAccess);
  app.use('/api/google-chat', requireBackendAccess);
  app.use('/api/chat/webhook', requireBackendAccess);
  app.use('/api/chat/proactive', requireBackendAccess);
  app.use('/api/diagnostics', requireBackendAccess);
  setupChatRoutes(app);
  setupMemoryRoutes(app);
  setupAudioRoutes(app);
  setupWorkspaceRoutes(app);
  setupDiagnosticsRoutes(app);

  // Vite middleware for development
  if (serverLockbox.runtime('NODE_ENV', 'development') !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
