import express from 'express';
import cors from 'cors';
import { runAgent } from './agent';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const port = 3000;

// Allow any origin to connect with comprehensive CORS config
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Cast to any to resolve typical type mismatch between express types and body-parser types
app.use(express.json() as any);

// Health Check Route
app.get('/', (req, res) => {
  console.log(`[Server] Health check ping received from ${req.ip}`);
  res.status(200).send('CareerFlow Agent Server is Running via Browser Use SDK');
});

app.post('/api/apply', async (req, res) => {
  const { url, user_info, cover_letter, resume_text, apiKey } = req.body;

  if (!url) {
    return res.status(400).json({ error: 'URL is required' });
  }

  if (!apiKey) {
    return res.status(400).json({ error: 'Browser Use API Key is required' });
  }

  console.log(`[Server] Received request to apply to: ${url}`);

  try {
    // Combine all candidate data for the prompt
    const candidateData = {
      ...user_info,
      responses: {
        coverLetter: cover_letter,
        relevantExperience: resume_text,
        // Add other fields if passed from frontend, otherwise they might be undefined in agent.ts
        whyThisRole: req.body.why_this_role,
        salaryExpectation: req.body.salary_expectation
      }
    };

    const result = await runAgent(url, candidateData, apiKey);
    
    return res.status(200).json({ 
      message: 'Agent execution finished',
      output: result.output 
    });
  } catch (error: any) {
    console.error('[Server] Agent Error:', error);
    return res.status(500).json({ error: error.message || "Internal Server Error" });
  }
});

// Bind to 0.0.0.0 to ensure accessibility across different environments
app.listen(port, '0.0.0.0', () => {
  console.log(`\n[Server] ✅ READY! Agent API is running on Port ${port}.`);
  console.log(`[Server] Please verify the Public URL in the 'Ports' tab and configure it in the frontend.`);
});