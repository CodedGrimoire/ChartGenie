const express = require('express');
const cors = require('cors');
const NodeCache = require('node-cache');
const { v4: uuidv4 } = require('uuid');

// Import our modules
const { CONFIG, OUTPUT_FORMATS } = require('./config');
const { testGroqConnection } = require('./groqService');
const { generateDiagram } = require('./diagramGenerator');
const { validateInput, summarizeExchange } = require('./utils');

const app = express();
const cache = new NodeCache({ stdTTL: CONFIG.CACHE_TTL });

// Store conversation sessions
const conversationSessions = new Map();

app.use(cors());
app.use(express.json());

/**
 * Health check endpoint
 */
app.get('/api/ping', (req, res) => {
  console.log('✅ Ping endpoint hit');
  
  res.json({ 
    message: 'ChartGenie Conversational Server is live!', 
    timestamp: new Date().toISOString(),
    supportedFormats: Object.values(OUTPUT_FORMATS),
    groqConfigured: !!CONFIG.GROQ_API_KEY,
    mode: 'CONVERSATIONAL_GROQ',
    activeSessions: conversationSessions.size
  });
});

/**
 * Test Groq API connection
 */
app.get('/api/test-groq', async (req, res) => {
  const result = await testGroqConnection();
  const statusCode = result.status === 'success' ? 200 : 500;
  res.status(statusCode).json(result);
});

/**
 * Main conversational diagram generation endpoint
 */
app.post('/api/diagram', async (req, res) => {
  console.log('🔥 Conversational diagram request:', req.body);
  
  const { 
    message: userPrompt, 
    format = 'mermaid',
    sessionId = null,
    currentDiagram = null 
  } = req.body;
  
  // Validate input
  const validation = validateInput(userPrompt, format);
  if (!validation.valid) {
    return res.status(400).json({ error: validation.error });
  }

  // Check if Groq API key is configured
  if (!CONFIG.GROQ_API_KEY) {
    return res.status(500).json({ 
      error: 'No Groq API key configured',
      message: 'Get free key at: https://console.groq.com/keys'
    });
  }

  // Get or create session
  let session = conversationSessions.get(sessionId) || {
    id: sessionId || uuidv4(),
    history: [],
    currentDiagram: null,
    createdAt: new Date()
  };

  // Update current diagram if provided
  if (currentDiagram) {
    session.currentDiagram = currentDiagram;
  }

  // Check cache with conversation context
  const cacheKey = `conv_${format}_${session.id}_${userPrompt.toLowerCase().replace(/\s+/g, '_')}_${session.history.length}`;
  const cached = cache.get(cacheKey);
  if (cached) {
    console.log('📦 Returning cached conversational result');
    return res.json({ ...cached, source: 'cache', sessionId: session.id });
  }

  try {
    // Generate diagram
    const result = await generateDiagram({
      userPrompt,
      format,
      conversationHistory: session.history,
      currentDiagram: session.currentDiagram
    });

    // Add session ID to result
    result.sessionId = session.id;

    // Update session with new exchange
    session.currentDiagram = result.diagramCode;
    session.history.push({
      userMessage: userPrompt,
      assistantSummary: summarizeExchange(userPrompt, result.diagramCode),
      timestamp: new Date()
    });
    
    // Keep only last N exchanges to prevent memory bloat
    if (session.history.length > CONFIG.MAX_CONVERSATION_HISTORY) {
      session.history = session.history.slice(-CONFIG.MAX_CONVERSATION_HISTORY);
    }
    
    conversationSessions.set(session.id, session);
    
    // Cache successful results
    cache.set(cacheKey, result);
    
    return res.json(result);

  } catch (error) {
    console.error('❌ Server Error:', error.message);
    return res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
});

/**
 * Get conversation history
 */
app.get('/api/conversation/:sessionId', (req, res) => {
  const { sessionId } = req.params;
  const session = conversationSessions.get(sessionId);
  
  if (!session) {
    return res.status(404).json({ error: 'Session not found' });
  }
  
  res.json({
    sessionId: session.id,
    history: session.history,
    currentDiagram: session.currentDiagram,
    createdAt: session.createdAt
  });
});

/**
 * Clear conversation
 */
app.delete('/api/conversation/:sessionId', (req, res) => {
  const { sessionId } = req.params;
  const existed = conversationSessions.delete(sessionId);
  
  if (!existed) {
    return res.status(404).json({ error: 'Session not found' });
  }
  
  res.json({ message: 'Conversation cleared' });
});

/**
 * List active sessions
 */
app.get('/api/sessions', (req, res) => {
  const sessions = Array.from(conversationSessions.entries()).map(([id, session]) => ({
    id,
    createdAt: session.createdAt,
    messageCount: session.history.length,
    lastActivity: session.history.length > 0 ? 
      session.history[session.history.length - 1].timestamp : 
      session.createdAt
  }));
  
  res.json({ sessions, count: sessions.length });
});

/**
 * Get supported formats
 */
app.get('/api/formats', (req, res) => {
  res.json({
    formats: OUTPUT_FORMATS,
    description: {
      [OUTPUT_FORMATS.MERMAID]: 'Mermaid.js diagrams for web rendering',
      [OUTPUT_FORMATS.LATEX_TIKZ]: 'TikZ/LaTeX code for academic papers',
      [OUTPUT_FORMATS.LATEX_PGF]: 'PGF/LaTeX code for advanced graphics',
      [OUTPUT_FORMATS.PLANTUML]: 'PlantUML for documentation'
    },
    mode: 'CONVERSATIONAL_GROQ'
  });
});

/**
 * Cache management
 */
app.delete('/api/cache', (req, res) => {
  const keyCount = cache.keys().length;
  cache.flushAll();
  res.json({ 
    message: 'Cache cleared successfully',
    clearedKeys: keyCount
  });
});

/**
 * Clean up old sessions (run periodically)
 */
function cleanupOldSessions() {
  const now = new Date();
  const CLEANUP_THRESHOLD = 24 * 60 * 60 * 1000; // 24 hours
  
  let cleanedCount = 0;
  for (const [sessionId, session] of conversationSessions.entries()) {
    const lastActivity = session.history.length > 0 ? 
      new Date(session.history[session.history.length - 1].timestamp) : 
      new Date(session.createdAt);
    
    if (now - lastActivity > CLEANUP_THRESHOLD) {
      conversationSessions.delete(sessionId);
      cleanedCount++;
    }
  }
  
  if (cleanedCount > 0) {
    console.log(`🧹 Cleaned up ${cleanedCount} old sessions`);
  }
}

// Clean up old sessions every hour
setInterval(cleanupOldSessions, 60 * 60 * 1000);

/**
 * Start the server
 */
app.listen(CONFIG.PORT, () => {
  console.log(`🚀 ChartGenie Conversational Server running at http://localhost:${CONFIG.PORT}`);
  console.log(`🔑 Groq API Key: ${CONFIG.GROQ_API_KEY ? 'Configured' : 'Missing'}`);
  console.log(`🤖 Mode: CONVERSATIONAL GROQ (Context-Aware)`);
  console.log(`📋 Endpoints:`);
  console.log(`   GET  /api/ping - Health check`);
  console.log(`   GET  /api/test-groq - Test Groq API`);
  console.log(`   POST /api/diagram - Generate/modify diagrams (conversational)`);
  console.log(`   GET  /api/conversation/:id - Get conversation history`);
  console.log(`   DELETE /api/conversation/:id - Clear conversation`);
  console.log(`   GET  /api/sessions - List active sessions`);
  console.log(`   GET  /api/formats - List supported formats`);
  console.log(`   DELETE /api/cache - Clear cache`);
  
  if (!CONFIG.GROQ_API_KEY) {
    console.log('\n⚠️  Setup Instructions:');
    console.log('   1. Go to: https://console.groq.com/keys');
    console.log('   2. Sign up (free)');
    console.log('   3. Create API key');
    console.log('   4. Add to .env: GROQ_API_KEY=your_key_here');
  }
  
  // Initial cleanup
  cleanupOldSessions();
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down gracefully...');
  console.log(`📊 Final stats: ${conversationSessions.size} active sessions`);
  process.exit(0);
});

module.exports = app;