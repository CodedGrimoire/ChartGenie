const express = require('express');
const cors = require('cors');
const NodeCache = require('node-cache');
require('dotenv').config();

const app = express();
const PORT = 3003;
const cache = new NodeCache({ stdTTL: 3600 });

app.use(cors());
app.use(express.json());

// Ollama configuration
const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434';

// Available Ollama models
const OLLAMA_MODELS = [
  {
    name: 'llama3-8b',
    model: 'llama3:8b',
    description: 'Llama 3 8B - Great for diagrams'
  },
  {
    name: 'codellama-7b',
    model: 'codellama:7b',
    description: 'CodeLlama 7B - Code focused'
  },
  {
    name: 'llama3-70b',
    model: 'llama3:70b',
    description: 'Llama 3 70B - Most capable (if you have it)'
  }
];

// Output formats
const OUTPUT_FORMATS = {
  MERMAID: 'mermaid',
  LATEX_TIKZ: 'tikz',
  LATEX_PGF: 'pgf',
  PLANTUML: 'plantuml'
};

// Simple validation
function validateInput(input, format = 'mermaid') {
  if (!input || typeof input !== 'string') return { valid: false, error: 'Invalid input' };
  if (input.length > 1000) return { valid: false, error: 'Input too long' };
  if (!Object.values(OUTPUT_FORMATS).includes(format)) {
    return { valid: false, error: 'Unsupported output format' };
  }
  return { valid: true };
}

// Simple prompt creation for Ollama
function createDiagramPrompt(userInput, outputFormat = 'mermaid') {
  return `Create a ${outputFormat} diagram for: ${userInput}

Output only the diagram code. Start immediately with the diagram type (like "erDiagram" or "flowchart TD").

Diagram:`;
}

// Function to call Ollama API
async function callOllama(model, prompt) {
  try {
    const response = await fetch(`${OLLAMA_URL}/api/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: model,
        prompt: prompt,
        stream: false,
        options: {
          temperature: 0.1,
          top_p: 0.9,
          max_tokens: 800
        }
      }),
    });

    if (!response.ok) {
      throw new Error(`Ollama API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return data.response;
  } catch (error) {
    throw new Error(`Failed to call Ollama: ${error.message}`);
  }
}

// Check if Ollama is running
async function checkOllamaHealth() {
  try {
    const response = await fetch(`${OLLAMA_URL}/api/tags`);
    return response.ok;
  } catch (error) {
    return false;
  }
}

// Get available models from Ollama
async function getOllamaModels() {
  try {
    const response = await fetch(`${OLLAMA_URL}/api/tags`);
    if (!response.ok) return [];
    
    const data = await response.json();
    return data.models || [];
  } catch (error) {
    return [];
  }
}

// Health check
app.get('/api/ping', async (req, res) => {
  console.log('✅ Ping endpoint hit');
  
  const ollamaHealthy = await checkOllamaHealth();
  const availableModels = await getOllamaModels();
  
  res.json({ 
    message: 'ChartGenie Server is live!', 
    timestamp: new Date().toISOString(),
    supportedFormats: Object.values(OUTPUT_FORMATS),
    ollamaUrl: OLLAMA_URL,
    ollamaHealthy: ollamaHealthy,
    mode: 'OLLAMA_LOCAL',
    configuredModels: OLLAMA_MODELS.map(m => m.name),
    availableModels: availableModels.map(m => m.name)
  });
});

// Test endpoint for Ollama models
app.get('/api/test-ollama', async (req, res) => {
  const ollamaHealthy = await checkOllamaHealth();
  
  if (!ollamaHealthy) {
    return res.status(500).json({ 
      error: 'Ollama not available',
      message: 'Make sure Ollama is running: ollama serve',
      ollamaUrl: OLLAMA_URL
    });
  }

  console.log('🧪 Testing Ollama Models...');
  const results = {};
  const availableModels = await getOllamaModels();

  for (const modelConfig of OLLAMA_MODELS) {
    try {
      // Check if model is actually available
      const isAvailable = availableModels.some(m => m.name === modelConfig.model);
      if (!isAvailable) {
        results[modelConfig.name] = {
          status: 'not_installed',
          available: false,
          model: modelConfig.model,
          message: `Run: ollama pull ${modelConfig.model}`
        };
        continue;
      }

      console.log(`🧪 Testing ${modelConfig.name}...`);
      
      const response = await callOllama(modelConfig.model, 'Hello! Just say "Hi" back.');
      
      results[modelConfig.name] = {
        status: 'success',
        available: true,
        model: modelConfig.model,
        response: response.substring(0, 100) // Limit response length
      };
      
      console.log(`   ✅ ${modelConfig.name} works!`);
      
    } catch (error) {
      results[modelConfig.name] = {
        status: 'error',
        available: false,
        model: modelConfig.model,
        error: error.message
      };
      console.log(`   ❌ ${modelConfig.name}: ${error.message}`);
    }
  }

  res.json({
    timestamp: new Date().toISOString(),
    method: 'ollama_api',
    ollamaUrl: OLLAMA_URL,
    results: results
  });
});

// Test specific model endpoint
app.post('/api/test-model', async (req, res) => {
  const { model = 'llama3:8b', prompt = 'What is 2+2?' } = req.body;
  
  const ollamaHealthy = await checkOllamaHealth();
  if (!ollamaHealthy) {
    return res.status(500).json({ 
      error: 'Ollama not available',
      message: 'Make sure Ollama is running: ollama serve'
    });
  }

  try {
    console.log(`🧪 Testing model ${model} with custom prompt...`);
    
    const response = await callOllama(model, prompt);
    
    res.json({
      status: 'success',
      model: model,
      prompt: prompt,
      response: response,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error(`❌ Model test failed:`, error.message);
    res.status(500).json({
      status: 'error',
      model: model,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Main diagram generation endpoint
app.post('/api/diagram', async (req, res) => {
  console.log('🔥 Diagram generation request:', req.body);
  
  const { message: userPrompt, format = 'mermaid', model = 'llama3:8b' } = req.body;
  
  const validation = validateInput(userPrompt, format);
  if (!validation.valid) {
    return res.status(400).json({ error: validation.error });
  }

  const ollamaHealthy = await checkOllamaHealth();
  if (!ollamaHealthy) {
    return res.status(500).json({ 
      error: 'Ollama not available',
      message: 'Make sure Ollama is running: ollama serve'
    });
  }

  // Check cache
  const cacheKey = `diagram_${format}_${model}_${userPrompt.toLowerCase().replace(/\s+/g, '_')}`;
  const cached = cache.get(cacheKey);
  if (cached) {
    console.log('📦 Returning cached result');
    return res.json({ ...cached, source: 'cache' });
  }

  const prompt = createDiagramPrompt(userPrompt, format);

  try {
    console.log('📡 Using Ollama...');
    console.log('🎯 Model:', model);
    console.log('🎯 Prompt:', prompt);
    
    // Try the specified model first, then fallback to available models
    const modelsToTry = [
      model,
      ...OLLAMA_MODELS.map(m => m.model).filter(m => m !== model)
    ];

    for (const currentModel of modelsToTry) {
      try {
        console.log(`🚀 Trying ${currentModel}...`);
        
        const response = await callOllama(currentModel, prompt);
        
        if (!response || response.length < 10) {
          console.log(`⚠️ ${currentModel} generated short response`);
          continue;
        }

        // Basic cleanup
        let diagramCode = response
          .replace(/```mermaid/gi, '')
          .replace(/```tikz/gi, '')
          .replace(/```plantuml/gi, '')
          .replace(/```/g, '')
          .trim();

        // Find diagram start
        const lines = diagramCode.split('\n');
        const diagramStart = lines.findIndex(line => 
          line.trim().toLowerCase().startsWith('erdiagram') ||
          line.trim().toLowerCase().startsWith('flowchart') ||
          line.trim().toLowerCase().startsWith('graph') ||
          line.trim().toLowerCase().startsWith('classDiagram') ||
          line.trim().toLowerCase().startsWith('sequenceDiagram')
        );

        if (diagramStart >= 0) {
          diagramCode = lines.slice(diagramStart).join('\n').trim();
        }

        console.log('✅ Generated diagram code:', diagramCode.substring(0, 100) + '...');
        
        const result = { 
          diagramCode,
          format,
          source: 'ollama',
          message: `Generated by ${currentModel}`,
          modelUsed: currentModel,
          ollamaUrl: OLLAMA_URL
        };
        
        // Cache successful results
        cache.set(cacheKey, result);
        
        return res.json(result);
        
      } catch (error) {
        console.log(`❌ ${currentModel} failed:`, error.message);
        continue;
      }
    }
    
    return res.status(500).json({
      error: 'All models failed',
      message: 'No Ollama model was able to generate a diagram',
      modelsAttempted: modelsToTry,
      suggestion: 'Try: ollama pull llama3:8b'
    });

  } catch (error) {
    console.error('❌ Fatal Error:', error.message);
    return res.status(500).json({
      error: 'Ollama request failed',
      message: error.message
    });
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
    mode: 'OLLAMA_LOCAL'
  });
});

// Available models endpoint
app.get('/api/models', async (req, res) => {
  const availableModels = await getOllamaModels();
  res.json({
    configured: OLLAMA_MODELS,
    available: availableModels,
    ollamaUrl: OLLAMA_URL
  });
});

// Cache management
app.delete('/api/cache', (req, res) => {
  cache.flushAll();
  res.json({ message: 'Cache cleared successfully' });
});

app.listen(PORT, async () => {
  console.log(`🚀 ChartGenie Server running at http://localhost:${PORT}`);
  console.log(`🔗 Ollama URL: ${OLLAMA_URL}`);
  
  const ollamaHealthy = await checkOllamaHealth();
  console.log(`🤖 Ollama Status: ${ollamaHealthy ? 'Available' : 'Not Running'}`);
  
  if (ollamaHealthy) {
    const models = await getOllamaModels();
    console.log(`📚 Available Models: ${models.map(m => m.name).join(', ')}`);
  }
  
  console.log(`🤖 Mode: OLLAMA LOCAL (100% FREE)`);
  console.log(`📋 Endpoints:`);
  console.log(`   GET  /api/ping - Health check`);
  console.log(`   GET  /api/test-ollama - Test all models`);
  console.log(`   POST /api/test-model - Test specific model`);
  console.log(`   POST /api/diagram - Generate diagrams`);
  console.log(`   GET  /api/formats - List supported formats`);
  console.log(`   GET  /api/models - List available models`);
  console.log(`   DELETE /api/cache - Clear cache`);
  
  if (!ollamaHealthy) {
    console.log('\n⚠️  Setup Instructions:');
    console.log('   1. Install: curl -fsSL https://ollama.ai/install.sh | sh');
    console.log('   2. Start: ollama serve');
    console.log('   3. Pull model: ollama pull llama3:8b');
  }
});