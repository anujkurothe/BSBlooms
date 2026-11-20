import 'dotenv/config';
import express, { type NextFunction, type Request, type Response } from 'express';
import path from 'node:path';
import { createServer as createViteServer } from 'vite';
import { CatalogStore } from './server/store.ts';
import type { FlowerDraft, StoreSettings } from './src/types/flower.ts';

const PORT = Number(process.env.PORT || 3000);
const SESSION_COOKIE = 'bsb_admin_session';

const store = new CatalogStore();
const sseClients = new Set<Response>();

function broadcastCatalogUpdate(): void {
  const payload = `data: ${JSON.stringify(store.getPublicCatalog())}\n\n`;
  for (const client of sseClients) {
    try {
      client.write(`event: catalog\n${payload}`);
    } catch {
      sseClients.delete(client);
    }
  }
}

function parseCookies(cookieHeader: string | undefined): Record<string, string> {
  if (!cookieHeader) return {};
  const result: Record<string, string> = {};
  for (const pair of cookieHeader.split(';')) {
    const idx = pair.indexOf('=');
    if (idx <= 0) continue;
    const key = pair.slice(0, idx).trim();
    const val = decodeURIComponent(pair.slice(idx + 1).trim());
    result[key] = val;
  }
  return result;
}

function extractToken(req: Request): string | undefined {
  const authHeader = req.headers.authorization;
  if (typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
    return authHeader.slice(7).trim();
  }
  const cookies = parseCookies(req.headers.cookie);
  return cookies[SESSION_COOKIE];
}

function setSessionCookie(req: Request, res: Response, token: string): void {
  const isSecure = req.secure || req.headers['x-forwarded-proto'] === 'https';
  res.cookie(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: isSecure ? 'none' : 'lax',
    secure: isSecure,
    path: '/',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
}

function clearSessionCookie(req: Request, res: Response): void {
  const isSecure = req.secure || req.headers['x-forwarded-proto'] === 'https';
  res.clearCookie(SESSION_COOKIE, {
    httpOnly: true,
    sameSite: isSecure ? 'none' : 'lax',
    secure: isSecure,
    path: '/',
  });
}

function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  const token = extractToken(req);
  if (!store.verifySessionToken(token)) {
    res.status(401).json({ error: 'Admin authentication required.' });
    return;
  }
  next();
}

async function startServer(): Promise<void> {
  const app = express();
  app.use(express.json({ limit: '6mb' }));

  app.use((req, res, next) => {
    if (
      req.path === '/api.php' ||
      req.path === '/.htaccess' ||
      req.path === '/data' ||
      req.path.startsWith('/data/')
    ) {
      res.status(404).end();
      return;
    }
    next();
  });

  app.get('/api/catalog', (_req, res) => {
    res.json({ ...store.getPublicCatalog(), realtime: 'sse' });
  });

  app.get('/api/events', (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();
    sseClients.add(res);

    const keepAlive = setInterval(() => {
      try {
        res.write(': keepalive\n\n');
      } catch {
        clearInterval(keepAlive);
        sseClients.delete(res);
      }
    }, 25000);

    req.on('close', () => {
      clearInterval(keepAlive);
      sseClients.delete(res);
    });
  });

  app.get('/api/admin/session', (req, res) => {
    const token = extractToken(req);
    res.json({ authenticated: store.verifySessionToken(token) });
  });

  app.post('/api/admin/login', (req, res) => {
    const password = typeof req.body?.password === 'string' ? req.body.password : '';
    const token = store.login(password);
    if (!token) {
      res.status(401).json({ error: 'Incorrect merchant password.' });
      return;
    }
    setSessionCookie(req, res, token);
    res.json({ authenticated: true, token });
  });

  app.post('/api/admin/logout', (req, res) => {
    clearSessionCookie(req, res);
    res.json({ authenticated: false });
  });

  app.post('/api/admin/change-password', requireAdmin, (req, res) => {
    const currentPassword =
      typeof req.body?.currentPassword === 'string' ? req.body.currentPassword : '';
    const newPassword = typeof req.body?.newPassword === 'string' ? req.body.newPassword : '';
    const result = store.changePassword(currentPassword, newPassword);
    if (!result.ok) {
      res.status(400).json({ error: result.error });
      return;
    }
    setSessionCookie(req, res, result.token);
    res.json({ ok: true, token: result.token });
  });

  app.post('/api/admin/flowers', requireAdmin, (req, res) => {
    try {
      const flower = store.saveFlower(req.body as FlowerDraft);
      broadcastCatalogUpdate();
      res.json({ flower, catalog: store.getPublicCatalog() });
    } catch (error) {
      res.status(400).json({
        error: error instanceof Error ? error.message : 'Unable to save flower variety.',
      });
    }
  });

  const handleDeleteFlower = (req: Request, res: Response) => {
    const removed = store.deleteFlower(String(req.params.id ?? ''));
    if (!removed) {
      res.status(404).json({ error: 'Variety not found.' });
      return;
    }
    broadcastCatalogUpdate();
    res.json({ ok: true, catalog: store.getPublicCatalog() });
  };
  app.delete('/api/admin/flowers/:id', requireAdmin, handleDeleteFlower);
  app.post('/api/admin/flowers/:id/delete', requireAdmin, handleDeleteFlower);

  app.post('/api/admin/flowers/reorder', requireAdmin, (req, res) => {
    const index = Number(req.body?.index);
    const direction = req.body?.direction === 'up' ? 'up' : 'down';
    const reordered = store.reorderFlower(index, direction);
    if (!reordered) {
      res.status(400).json({ error: 'Cannot reorder variety in that direction.' });
      return;
    }
    broadcastCatalogUpdate();
    res.json({ flowers: reordered, catalog: store.getPublicCatalog() });
  });

  app.post('/api/admin/flowers/seed', requireAdmin, (_req, res) => {
    const flowers = store.resetSeedFlowers();
    broadcastCatalogUpdate();
    res.json({ flowers, catalog: store.getPublicCatalog() });
  });

  const handleSaveSettings = (req: Request, res: Response) => {
    try {
      const storeSettings = store.updateStoreSettings(req.body as StoreSettings);
      broadcastCatalogUpdate();
      res.json({ storeSettings, catalog: store.getPublicCatalog() });
    } catch (error) {
      res.status(400).json({
        error: error instanceof Error ? error.message : 'Unable to save store settings.',
      });
    }
  };
  app.put('/api/admin/settings', requireAdmin, handleSaveSettings);
  app.post('/api/admin/settings', requireAdmin, handleSaveSettings);

  const isProduction = process.env.NODE_ENV === 'production';
  if (!isProduction) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`BSBlooms server listening on http://0.0.0.0:${PORT}`);
  });
}

void startServer();
