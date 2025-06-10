const express = require('express');
const cors = require('cors');
const NodeCache = require('node-cache');
require('dotenv').config();

const app = express();
const PORT = 3003;
const cache = new NodeCache({ stdTTL: 3600 });

app.use(cors());
app.use(express.json());

const GROQ_API_KEY = process.env.GROQ_API_KEY;

// Output formats
const OUTPUT_FORMATS = {
  MERMAID: 'mermaid',
  LATEX_TIKZ: 'tikz',
  LATEX_PGF: 'pgf',
  PLANTUML: 'plantuml'
};

function validateInput(input, format = 'mermaid') {
  if (!input || typeof input !== 'string') return { valid: false, error: 'Invalid input' };
  if (input.length > 1000) return { valid: false, error: 'Input too long' };
  if (!Object.values(OUTPUT_FORMATS).includes(format)) {
    return { valid: false, error: 'Unsupported output format' };
  }
  return { valid: true };
}

function createDiagramPrompt(userInput, outputFormat = 'mermaid') {
  if (outputFormat === 'mermaid') {
    return `Create a mermaid erDiagram for: ${userInput}

Format:
erDiagram
    ENTITY1 {
        int id PK
        string name
    }
    ENTITY2 {
        int id PK
        int entity1_id FK
    }
    ENTITY1 ||--o{ ENTITY2 : has

Output only valid mermaid syntax:`;
  }
  
  return `Create a ${outputFormat} diagram for: ${userInput}. Output only valid syntax.`;
}

// Call Groq API
async function callGroq(prompt) {
  if (!GROQ_API_KEY) {
    throw new Error('No Groq API key configured');
  }

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'llama3-8b-8192',
        messages: [
          {
            role: 'system',
            content: 'You generate only diagram code. No explanations.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 800,
        temperature: 0.1
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Groq API error: ${response.status} - ${error}`);
    }

    const data = await response.json();
    return data.choices[0]?.message?.content || '';
  } catch (error) {
    throw new Error(`Failed to call Groq: ${error.message}`);
  }
}

// Generate fallback diagram
function generateFallbackDiagram(prompt) {
  const lower = prompt.toLowerCase();
  
  if (lower.includes('hospital') || lower.includes('medical')) {
    return `erDiagram
    PATIENT {
        int patient_id PK
        string name
        string email
    }
    DOCTOR {
        int doctor_id PK
        string name
        string specialty
    }
    APPOINTMENT {
        int appointment_id PK
        int patient_id FK
        int doctor_id FK
        date appointment_date
    }
    PATIENT ||--o{ APPOINTMENT : books
    DOCTOR ||--o{ APPOINTMENT : conducts`;
  }
  
  return `erDiagram
    USER {
        int id PK
        string name
        string email
    }
    ITEM {
        int id PK
        string title
        int user_id FK
    }
    USER ||--o{ ITEM : owns`;
}

// Health check
app.get('/api/ping', (req, res) => {
  console.log('✅ Ping endpoint hit');
  
  res.json({ 
    message: 'ChartGenie Server is live!', 
    timestamp: new Date().toISOString(),
    supportedFormats: Object.values(OUTPUT_FORMATS),
    groqConfigured: !!GROQ_API_KEY,
    mode: 'GROQ_FREE'
  });
});

// Test Groq
app.get('/api/test-groq', async (req, res) => {
  if (!GROQ_API_KEY) {
    return res.status(500).json({ 
      error: 'No Groq API key',
      message: 'Set GROQ_API_KEY in .env file',
      signup: 'https://console.groq.com/keys'
    });
  }

  try {
    console.log('🧪 Testing Groq...');
    
    const response = await callGroq('Hello! Just say "Hi" back.');
    
    res.json({
      status: 'success',
      provider: 'groq',
      model: 'llama3-8b-8192',
      response: response.substring(0, 100),
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Groq test failed:', error.message);
    res.status(500).json({
      status: 'error',
      provider: 'groq',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Main diagram generation endpoint
app.post('/api/diagram', async (req, res) => {
  console.log('🔥 Diagram generation request:', req.body);
  
  const { message: userPrompt, format = 'mermaid' } = req.body;
  
  const validation = validateInput(userPrompt, format);
  if (!validation.valid) {
    return res.status(400).json({ error: validation.error });
  }

  if (!GROQ_API_KEY) {
    return res.status(500).json({ 
      error: 'No Groq API key configured',
      message: 'Get free key at: https://console.groq.com/keys'
    });
  }

  // Check cache
  const cacheKey = `diagram_${format}_${userPrompt.toLowerCase().replace(/\s+/g, '_')}`;
  const cached = cache.get(cacheKey);
  if (cached) {
    console.log('📦 Returning cached result');
    return res.json({ ...cached, source: 'cache' });
  }

  const prompt = createDiagramPrompt(userPrompt, format);

  try {
    console.log('📡 Using Groq...');
    console.log('🎯 Prompt:', prompt.substring(0, 100) + '...');
    
    const response = await callGroq(prompt);
    
    if (!response || response.length < 10) {
      console.log('⚠️ Groq generated short response, using fallback');
      const fallbackCode = generateFallbackDiagram(userPrompt);
      
      const result = { 
        diagramCode: fallbackCode,
        format,
        source: 'fallback_template',
        message: 'Generated using fallback template',
        provider: 'template'
      };
      
      cache.set(cacheKey, result);
      return res.json(result);
    }

    // Basic cleanup
    let diagramCode = response
      .replace(/```mermaid/gi, '')
      .replace(/```tikz/gi, '')
      .replace(/```plantuml/gi, '')
      .replace(/```/g, '')
      .trim();

    // Extract diagram from response
    const lines = diagramCode.split('\n');
    const diagramStart = lines.findIndex(line => 
      line.trim().toLowerCase().startsWith('erdiagram')
    );

    if (diagramStart >= 0) {
      diagramCode = lines.slice(diagramStart).join('\n').trim();
      diagramCode = diagramCode.replace(/^erdiagram/i, 'erDiagram');
    }

    // If still invalid, use fallback
    if (!diagramCode.includes('erDiagram') || diagramCode.split('\n').length < 3) {
      console.log('⚠️ Invalid diagram structure, using fallback');
      diagramCode = generateFallbackDiagram(userPrompt);
    }

    console.log('✅ Generated diagram code:', diagramCode.substring(0, 100) + '...');
    
    const result = { 
      diagramCode,
      format,
      source: 'groq',
      message: 'Generated by Groq Llama 3',
      provider: 'groq',
      model: 'llama3-8b-8192'
    };
    
    // Cache successful results
    cache.set(cacheKey, result);
    
    return res.json(result);

  } catch (error) {
    console.error('❌ Groq Error:', error.message);
    
    // Always provide fallback
    const fallbackCode = generateFallbackDiagram(userPrompt);
    
    const result = { 
      diagramCode: fallbackCode,
      format,
      source: 'fallback_on_error',
      message: 'Generated using fallback template due to API error',
      provider: 'template',
      originalError: error.message
    };
    
    return res.json(result);
  }
});

// Supported formats endpoint
app.get('/api/formats', (req, res) => {
  res.json({
    formats: OUTPUT_FORMATS,
    description: {
      [OUTPUT_FORMATS.MERMAID]: 'Mermaid.js diagrams for web rendering',
      [OUTPUT_FORMATS.LATEX_TIKZ]: 'TikZ/LaTeX code for academic papers',
      [OUTPUT_FORMATS.LATEX_PGF]: 'PGF/LaTeX code for advanced graphics',
      [OUTPUT_FORMATS.PLANTUML]: 'PlantUML for documentation'
    },
    mode: 'GROQ_FREE'
  });
});

// Cache management
app.delete('/api/cache', (req, res) => {
  cache.flushAll();
  res.json({ message: 'Cache cleared successfully' });
});

app.listen(PORT, () => {
  console.log(`🚀 ChartGenie Server running at http://localhost:${PORT}`);
  console.log(`🔑 Groq API Key: ${GROQ_API_KEY ? 'Configured' : 'Missing'}`);
  console.log(`🤖 Mode: GROQ FREE (Fast & Reliable)`);
  console.log(`📋 Endpoints:`);
  console.log(`   GET  /api/ping - Health check`);
  console.log(`   GET  /api/test-groq - Test Groq API`);
  console.log(`   POST /api/diagram - Generate diagrams`);
  console.log(`   GET  /api/formats - List supported formats`);
  console.log(`   DELETE /api/cache - Clear cache`);
  
  if (!GROQ_API_KEY) {
    console.log('\n⚠️  Setup Instructions:');
    console.log('   1. Go to: https://console.groq.com/keys');
    console.log('   2. Sign up (free)');
    console.log('   3. Create API key');
    console.log('   4. Add to .env: GROQ_API_KEY=your_key_here');
  }
});