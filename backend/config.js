require('dotenv').config();

// Environment variables
const CONFIG = {
  PORT: process.env.PORT || 3003,
  GROQ_API_KEY: process.env.GROQ_API_KEY,
  CACHE_TTL: 3600, // Cache time-to-live in seconds
  MAX_INPUT_LENGTH: 1000,
  MAX_CONVERSATION_HISTORY: 10,
  CONTEXT_HISTORY_SIZE: 3
};

// Output formats
const OUTPUT_FORMATS = {
  MERMAID: 'mermaid',
  LATEX_TIKZ: 'tikz',
  LATEX_PGF: 'pgf',
  PLANTUML: 'plantuml'
};

// Groq API configuration
const GROQ_CONFIG = {
  BASE_URL: 'https://api.groq.com/openai/v1/chat/completions',
  MODEL: 'llama3-8b-8192',
  MAX_TOKENS: 1000,
  TEMPERATURE: 0.1
};

module.exports = {
  CONFIG,
  OUTPUT_FORMATS,
  GROQ_CONFIG
};