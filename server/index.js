import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { ZeroGComputeService } from '../src/services/0gComputeService.js';

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

app.get('/api/health', (_req, res) => {
  res.json({ ok: true });
});

app.get('/api/balance', async (_req, res) => {
  try {
    const balance = await ZeroGComputeService.getBalance();
    res.json({ balance });
  } catch (error) {
    res.status(500).json({ error: error?.message || 'Failed to get balance' });
  }
});

app.post('/api/chat', async (req, res) => {
  try {
    const prompt = String(req.body?.prompt || '');
    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    console.log('Express /api/chat called with prompt:', prompt);
    
    // Try to get AI response with proper error handling
    try {
      const answer = await ZeroGComputeService.sendAIRequest(prompt);
      console.log('Express /api/chat success:', answer);
      res.json({ answer });
    } catch (aiError) {
      console.warn('Express /api/chat: 0G Compute failed, returning fallback response:', aiError?.message);
      
      // Return a fallback AI response instead of an error
      const fallbackResponse = {
        severity: 'moderate',
        confidence: 0.6,
        summary: `Traffic analysis temporarily unavailable. Using basic traffic data.`,
        recommendations: [
          'Check real-time traffic updates before departure',
          'Consider alternative routes if available',
          'Allow extra time for your journey'
        ],
        predictedCongestion: 45,
        bestTimeToTravel: 'Current time is optimal for travel',
        alternativeRoutesSuggestion: 'Consider checking alternative routes for better traffic conditions',
        estimatedDelay: 5
      };
      
      console.log('Express /api/chat: Returning fallback response');
      res.json({ answer: JSON.stringify(fallbackResponse) });
    }
  } catch (error) {
    console.error('Express /api/chat: Unexpected error:', error);
    res.status(500).json({ error: error?.message || 'Chat failed' });
  }
});

app.post('/api/qwen', async (req, res) => {
  try {
    const prompt = String(req.body?.prompt || '');
    const answer = await ZeroGComputeService.sendAIRequest(prompt, '0x3feE5a4dd5FDb8a32dDA97Bed899830605dBD9D3'); // DeepSeek R1
    res.json({ answer });
  } catch (error) {
    res.status(500).json({ error: error?.message || 'Qwen failed' });
  }
});

app.post('/api/llama', async (req, res) => {
  try {
    const prompt = String(req.body?.prompt || '');
    const answer = await ZeroGComputeService.sendAIRequest(prompt, '0xf07240Efa67755B5311bc75784a061eDB47165Dd'); // Llama 3.3
    res.json({ answer });
  } catch (error) {
    res.status(500).json({ error: error?.message || 'Llama failed' });
  }
});

app.listen(PORT, () => {
  // Basic startup log with env hint
  // Only logs keys presence, not values
  const hasPk = !!(process.env.PRIVATE_KEY || process.env.ZEROG_PRIVATE_KEY || process.env.VITE_ZEROG_PRIVATE_KEY);
  const hasRpc = !!(process.env.ZEROG_RPC_URL || process.env.VITE_ZEROG_RPC_URL);
  console.log(`0G server listening on :${PORT} (key:${hasPk}, rpc:${hasRpc})`);
});


