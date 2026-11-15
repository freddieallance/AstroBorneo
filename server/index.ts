/**
 * Google AI Studio / ordinary Node entry point.
 * ONE server process and ONE port for the React app + NASA API.
 * No Replit environment variables or Replit-specific hosting dependencies.
 */
import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateDates, weather } from './nasa/service';
import { getNasaResearch } from './nasa/research';
import type { EventType } from './nasa/providers';

const app = express();
app.disable('x-powered-by');
app.get('/api/healthz', (_req, res) => { res.json({ status: 'ok' }); });
app.get('/api/nasa/research', async (_req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  try {
    res.json(await getNasaResearch(false));
  } catch {
    res.json(await getNasaResearch(true));
  }
});
app.get('/api/nasa/space-weather', async (req, res) => {
  const { eventType = 'FLR', startDate = '2024-05-10', endDate = '2024-05-10', mode = 'auto' } = req.query;
  if (Object.keys(req.query).some(k => !['eventType', 'startDate', 'endDate', 'mode'].includes(k))
    || typeof eventType !== 'string' || !['FLR', 'SEP', 'CME'].includes(eventType)
    || typeof startDate !== 'string' || typeof endDate !== 'string' || !validateDates(startDate, endDate)
    || typeof mode !== 'string' || !['auto', 'archived', 'simulated'].includes(mode)) {
    res.status(400).json({ error: 'Choose FLR, SEP or CME with valid dates up to 30 days apart, not in the future.' });
    return;
  }
  res.setHeader('Cache-Control', 'no-store');
  try {
    res.json(await weather(eventType as EventType, startDate, endDate, mode));
  } catch {
    // Prevent raw upstream errors or API keys from being shown to browser users.
    res.status(503).json({ mode: 'SIMULATED_SCENARIO', status: 'UNAVAILABLE', cached: false, stale: false, records: [], message: 'Space-weather data is unavailable. The training game still works.' });
  }
});

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const isProd = process.env.NODE_ENV === 'production';
if (!isProd) {
  // Vite dev middleware serves the SPA on the SAME port as /api; no proxy or second service.
  const { createServer } = await import('vite');
  const vite = await createServer({ configFile: path.join(root, 'vite.config.ts'), server: { middlewareMode: true }, appType: 'spa' });
  app.use(vite.middlewares);
} else {
  const built = path.resolve(root, 'dist');
  app.use(express.static(built, { index: false }));
  app.use((req, res) => {
    if (req.path.startsWith('/api/')) { res.status(404).json({ error: 'Unknown API endpoint' }); return; }
    res.sendFile(path.join(built, 'index.html'));
  });
}
const port = Number(process.env.PORT ?? 3000);
if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('PORT must be a valid port number.');
app.listen(port, '0.0.0.0', () => console.info(`AstroBorneo running on http://localhost:${port}`));
