import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { processCsvImport } from './extractor.js';

dotenv.config();

const app = express();
const port = process.env.PORT || 5000;

// Enable CORS for frontend requests
app.use(cors({
  origin: '*', // In production, replace with specific frontend URL
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Increase body size limits for parsing large CSV payloads
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// Standard non-streaming API endpoint
app.post('/api/import', async (req, res) => {
  try {
    const { rows } = req.body;
    if (!rows || !Array.isArray(rows)) {
      return res.status(400).json({ error: 'Invalid payload: "rows" is required and must be an array.' });
    }

    if (rows.length === 0) {
      return res.json({
        imported: [],
        skipped: [],
        totalImported: 0,
        totalSkipped: 0
      });
    }

    const result = await processCsvImport(rows);
    return res.json(result);
  } catch (error: any) {
    console.error('Import error:', error);
    return res.status(500).json({
      error: 'An internal server error occurred during CSV processing.',
      details: error.message
    });
  }
});

// SSE Streaming progress API endpoint
app.post('/api/import/sse', async (req, res) => {
  const { rows } = req.body;

  if (!rows || !Array.isArray(rows)) {
    res.status(400).json({ error: 'Invalid payload: "rows" is required and must be an array.' });
    return;
  }

  // Set headers for Server-Sent Events
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no'); // Disable buffering on Nginx/reverse proxies

  // Send an initial event immediately
  res.write(`data: ${JSON.stringify({ type: 'start', totalRows: rows.length })}\n\n`);

  if (rows.length === 0) {
    res.write(`data: ${JSON.stringify({
      type: 'complete',
      result: {
        imported: [],
        skipped: [],
        totalImported: 0,
        totalSkipped: 0
      }
    })}\n\n`);
    res.end();
    return;
  }

  try {
    const result = await processCsvImport(rows, (progress) => {
      // Send real-time batch progress updates
      res.write(`data: ${JSON.stringify({
        type: 'progress',
        currentBatch: progress.currentBatch,
        totalBatches: progress.totalBatches,
        importedCount: progress.importedCount,
        skippedCount: progress.skippedCount
      })}\n\n`);
    });

    // Send final merged results
    res.write(`data: ${JSON.stringify({
      type: 'complete',
      result
    })}\n\n`);
  } catch (error: any) {
    console.error('Import streaming error:', error);
    res.write(`data: ${JSON.stringify({
      type: 'error',
      message: error.message || 'An error occurred during extraction.'
    })}\n\n`);
  } finally {
    res.end();
  }
});

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
