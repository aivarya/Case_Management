const express = require('express');
const router = express.Router();
const { GoogleGenerativeAI } = require('@google/generative-ai');

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY);

function requireAuth(req, res, next) {
  if (!req.session?.userId) return res.status(401).json({ error: 'Unauthorized' });
  next();
}

router.post('/correct', requireAuth, async (req, res) => {
  const { text } = req.body;
  if (!text?.trim()) return res.status(400).json({ error: 'text is required' });

  try {
    const model = genAI.getGenerativeModel({ model: 'gemma-3-12b-it' });
    const prompt = `You are a professional writing assistant for an IT helpdesk system. Improve the following text by fixing grammar, spelling, and sentence structure. Preserve all technical terms, hostnames, error codes, software names, and proper nouns exactly as written. Return ONLY the corrected text with no explanations, no quotes, and no additional commentary.\n\nText to improve:\n${text}`;
    const result = await model.generateContent(prompt);
    const corrected = result.response.text().trim();
    res.json({ corrected });
  } catch (err) {
    console.error('AI correction error:', err.message);
    res.status(500).json({ error: 'AI service unavailable' });
  }
});

module.exports = router;
