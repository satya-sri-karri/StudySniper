import path from 'path';
import express from 'express';
import { app } from './server/app.ts';

const PORT = 3000;

// Serve static assets in production build
const distPath = path.join(process.cwd(), 'dist');
app.use(express.static(distPath));

// Fallback to index.html for SPA routing
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) {
    return next();
  }
  res.sendFile(path.join(distPath, 'index.html'), (err) => {
    if (err) {
      res.status(200).send('Study Sniper AI server active');
    }
  });
});

app.listen(PORT, () => {
  console.log(`Study Sniper AI server running on port ${PORT}`);
});
