import type { RequestHandler } from 'express';
import { serverLockbox } from '../services/lockbox';

const LOCAL_ORIGINS = new Set([
  'http://localhost:3000',
  'http://127.0.0.1:3000',
]);

function isProduction(): boolean {
  return serverLockbox.runtime('NODE_ENV', 'development') === 'production';
}

function allowedOrigins(): Set<string> {
  const configured = serverLockbox.config('ELARA_ALLOWED_ORIGINS', '') || '';
  const values = configured.split(',').map((value) => value.trim()).filter(Boolean);
  if (!isProduction()) LOCAL_ORIGINS.forEach((origin) => values.push(origin));
  return new Set(values);
}

export const serverCors: RequestHandler = (req, res, next) => {
  const origin = req.get('Origin');
  const allowed = allowedOrigins();

  if (origin && allowed.has(origin)) {
    res.header('Access-Control-Allow-Origin', origin);
    res.header('Vary', 'Origin');
    res.header('Access-Control-Allow-Credentials', 'true');
  }

  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');

  if (req.method === 'OPTIONS') {
    if (!origin || allowed.has(origin)) return res.sendStatus(204);
    return res.status(403).json({ error: 'Origin not allowed.' });
  }
  next();
};

export const requireBackendAccess: RequestHandler = (req, res, next) => {
  if (!isProduction()) {
    const origin = req.get('Origin');
    if (!origin || LOCAL_ORIGINS.has(origin)) return next();
    return res.status(403).json({ error: 'Non-local development access is disabled.' });
  }

  const configuredToken = serverLockbox.optionalSecret('ELARA_SERVER_ACCESS_TOKEN');
  if (!configuredToken) {
    return res.status(503).json({ error: 'Backend access is not configured for public production use.' });
  }

  const suppliedToken = req.get('Authorization')?.replace(/^Bearer\s+/i, '').trim();
  if (!suppliedToken || suppliedToken !== configuredToken) {
    return res.status(401).json({ error: 'Unauthorized.' });
  }

  next();
};
