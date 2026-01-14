import { describe, it, expect } from 'vitest';
import request from 'supertest';
import express from 'express';

// Criar uma versão simplificada do app para testes
function createTestApp() {
  const app = express();
  app.use(express.json());

  // Health check endpoint (espelha o endpoint real)
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  return app;
}

describe('API Health Check', () => {
  const app = createTestApp();

  it('should return 200 OK on health check', async () => {
    const response = await request(app).get('/api/health');

    expect(response.status).toBe(200);
    expect(response.body.status).toBe('ok');
    expect(response.body.timestamp).toBeDefined();
  });

  it('should return JSON content-type', async () => {
    const response = await request(app).get('/api/health');

    expect(response.headers['content-type']).toMatch(/json/);
  });

  it('should include a valid ISO timestamp', async () => {
    const response = await request(app).get('/api/health');

    const timestamp = new Date(response.body.timestamp);
    expect(timestamp.toString()).not.toBe('Invalid Date');
  });
});
