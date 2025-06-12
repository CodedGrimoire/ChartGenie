require('dotenv').config();

// Output formats supported by the system
const OUTPUT_FORMATS = {
  MERMAID: 'mermaid',
  LATEX_TIKZ: 'tikz',
  LATEX_PGF: 'pgf',
  PLANTUML: 'plantuml'
};

// Server configuration
const CONFIG = {
  PORT: 3003,
  CACHE_TTL: 3600, // 1 hour
  MAX_INPUT_LENGTH: 1000,
  MAX_CONVERSATION_HISTORY: 10,
  MAX_CONTEXT_EXCHANGES: 3,
  GROQ_API_URL: 'https://api.groq.com/openai/v1/chat/completions',
  GROQ_MODEL: 'llama3-8b-8192',
  MAX_TOKENS: 2000,
  TEMPERATURE: 0.1
};

// Environment variables
const ENV = {
  GROQ_API_KEY: process.env.GROQ_API_KEY
};

module.exports = {
  OUTPUT_FORMATS,
  CONFIG,
  ENV
};