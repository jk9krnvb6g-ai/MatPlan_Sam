import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import apiRouter from './src/backend/routes';

async function startServer() {
  const app = express();
  const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

  // Middleware to parse JSON payloads
  app.use(express.json({ limit: '50mb' }));

  // API Routes
  app.use('/MatPlan/api', apiRouter);
  app.use('/system-a/api', apiRouter);
  app.use('/api', apiRouter);

  // Serve static files / Vite middleware
  if (process.env.NODE_ENV !== 'production') {
    console.log('Running in DEVELOPMENT mode - Mounting Vite middleware...');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    console.log('Running in PRODUCTION mode - Serving static assets from dist...');
    const distPath = path.join(process.cwd(), 'dist');
    
    // Serve static files from both root and subpath
    app.use('/MatPlan', express.static(distPath));
    app.use('/system-a', express.static(distPath));
    app.use(express.static(distPath));
    
    app.get('/MatPlan/*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
    app.get('/system-a/*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running at http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
});
