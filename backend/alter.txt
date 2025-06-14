const express = require('express');
const cors = require('cors');
const NodeCache = require('node-cache');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();

const app = express();
const PORT = 3003;
const cache = new NodeCache({ stdTTL: 3600 });

// Store conversation sessions
const conversationSessions = new Map();

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

// Enhanced conversation-aware prompt creation
function createConversationalPrompt(userInput, outputFormat, conversationHistory, currentDiagram) {
  const history = conversationHistory.slice(-3); // Keep last 3 exchanges for context
  
  let contextPrompt = '';
  
  // Build conversation context
  if (history.length > 0) {
    contextPrompt = '\nConversation context:\n';
    history.forEach((exchange, idx) => {
      contextPrompt += `- User said: "${exchange.userMessage}"\n`;
    });
  }
  
  // Determine if this is a modification request
  const isModification = detectModificationIntent(userInput, currentDiagram);
  
  if (outputFormat === 'mermaid') {
    if (isModification && currentDiagram) {
      return `You are modifying an existing database diagram. DO NOT CREATE A NEW DIAGRAM.

EXISTING DIAGRAM (COPY THIS EXACTLY AND ADD TO IT):
${currentDiagram}

USER REQUEST: "${userInput}"

STEP-BY-STEP INSTRUCTIONS:
1. COPY the entire existing diagram above EXACTLY as it is
2. ADD the new table/entity that the user requested 
3. ADD appropriate relationships between new and existing entities
4. Output the COMPLETE diagram with ALL original entities PLUS the new addition

EXAMPLE OF CORRECT BEHAVIOR:
If existing diagram has USER and PRODUCT, and user says "add reviews"
You should output: USER + PRODUCT + REVIEWS (all three tables)

FORBIDDEN: Do NOT recreate, do NOT start fresh, do NOT remove existing entities

Output ONLY the complete mermaid erDiagram with all existing + new entities:`;
    } else {
      return `You are creating a new database diagram.${contextPrompt}

USER REQUEST: "${userInput}"

Create a complete mermaid erDiagram with:
- Relevant entities for the requested domain
- Proper primary keys (PK) and foreign keys (FK)
- Realistic relationships between entities
- Appropriate data types

Format example:
erDiagram
    ENTITY1 {
        int id PK
        string name
        string email
    }
    ENTITY2 {
        int id PK
        int entity1_id FK
        string description
    }
    ENTITY1 ||--o{ ENTITY2 : has

Output only valid mermaid erDiagram syntax:`;
    }
  }
  
  return `Create a ${outputFormat} diagram based on: "${userInput}"
${currentDiagram ? `\nExisting diagram:\n${currentDiagram}` : ''}
Output only valid ${outputFormat} syntax.`;
}

// Improved modification intent detection
function detectModificationIntent(userInput, currentDiagram) {
  if (!currentDiagram) return false;
  
  const input = userInput.toLowerCase();
  
  // Strong modification indicators
  const strongModificationKeywords = [
    'add', 'include', 'also add', 'plus', 'and also', 'extend', 'expand',
    'remove', 'delete', 'drop', 'take out', 'get rid of',
    'modify', 'change', 'update', 'edit', 'alter', 'adjust',
    'connect', 'link', 'relate', 'join', 'associate',
    'disconnect', 'unlink', 'separate'
  ];
  
  // Weak indicators that might suggest modification
  const weakModificationKeywords = [
    'need', 'want', 'should have', 'missing', 'forgot',
    'also', 'too', 'as well', 'another', 'more'
  ];
  
  // Check for strong indicators first
  const hasStrong = strongModificationKeywords.some(keyword => input.includes(keyword));
  if (hasStrong) return true;
  
  // Check for weak indicators with additional context
  const hasWeak = weakModificationKeywords.some(keyword => input.includes(keyword));
  const hasTableKeywords = input.includes('table') || input.includes('entity') || input.includes('field');
  
  return hasWeak && hasTableKeywords;
}

// Extract key information from user message for history
function summarizeExchange(userMessage, diagramCode) {
  const entities = extractEntitiesFromDiagram(diagramCode);
  return `Created diagram with entities: ${entities.join(', ')}`;
}

// Validate that modifications preserve existing entities (stricter validation)
function validateModificationPreservesEntities(newDiagram, originalDiagram) {
  if (!originalDiagram || !newDiagram) return false;
  
  const originalEntities = extractEntitiesFromDiagram(originalDiagram);
  const newEntities = extractEntitiesFromDiagram(newDiagram);
  
  console.log('🔍 Validation check:');
  console.log('Original entities:', originalEntities);
  console.log('New entities:', newEntities);
  
  // Check that ALL original entities are present (strict check)
  const missingEntities = originalEntities.filter(entity => 
    !newEntities.includes(entity)
  );
  
  if (missingEntities.length > 0) {
    console.log('❌ Missing entities in modified diagram:', missingEntities);
    return false;
  }
  
  // Check that we have MORE entities (indicating addition)
  if (newEntities.length <= originalEntities.length) {
    console.log('❌ No new entities added, same or fewer entities detected');
    return false;
  }
  
  console.log('✅ Modification validation passed');
  return true;
}

// Extract entity names from mermaid diagram (improved)
function extractEntitiesFromDiagram(diagramCode) {
  if (!diagramCode) return [];
  
  const lines = diagramCode.split('\n');
  const entities = [];
  
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('erDiagram') && !trimmed.includes('||--') && !trimmed.includes('}')) {
      const match = trimmed.match(/^([A-Z_][A-Z0-9_]*)\s*\{/);
      if (match) {
        entities.push(match[1]);
      }
    }
  }
  
  return [...new Set(entities)]; // Remove duplicates
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
            content: 'You are an expert database diagram assistant. When modifying existing diagrams, you MUST preserve all existing entities unless explicitly asked to remove them. When users ask to "add" something, keep everything that already exists and only add the new requested elements. Never recreate diagrams from scratch when modifications are requested. Generate only diagram code, no explanations.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 1000,
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

// Enhanced conversational fallback that preserves existing diagrams
function generateConversationalFallback(userInput, conversationHistory, currentDiagram) {
  const isModification = detectModificationIntent(userInput, currentDiagram);
  
  console.log('🔄 Generating fallback - isModification:', isModification);
  
  if (isModification && currentDiagram) {
    console.log('📋 Preserving existing diagram and adding to it');
    
    // Extract what the user wants to add
    const newTableName = extractTableNameFromInput(userInput);
    console.log('🎯 Detected table to add:', newTableName);
    
    if (newTableName) {
      // Parse existing entities to understand current structure
      const existingEntities = parseExistingDiagram(currentDiagram);
      console.log('📊 Existing entities:', existingEntities.map(e => e.name));
      
      // Create the new table with smart connections
      const newTable = generateNewTable(newTableName, existingEntities);
      
      // Combine existing diagram with new table
      const preservedDiagram = currentDiagram.trim() + '\n' + newTable;
      
      console.log('✅ Fallback: Preserved existing + added new table');
      return preservedDiagram;
    }
    
    // If we can't determine what to add, return current diagram unchanged
    console.log('⚠️ Could not determine what to add, returning current diagram');
    return currentDiagram;
  }
  
  // Generate new diagram based on conversation (existing logic)
  console.log('🆕 Generating fresh diagram');
  const lower = userInput.toLowerCase();
  
  if (lower.includes('hospital') || lower.includes('medical') || lower.includes('patient')) {
    return `erDiagram
    PATIENT {
        int patient_id PK
        string first_name
        string last_name
        string email
        string phone
        date date_of_birth
    }
    DOCTOR {
        int doctor_id PK
        string first_name
        string last_name
        string specialty
        string email
    }
    APPOINTMENT {
        int appointment_id PK
        int patient_id FK
        int doctor_id FK
        datetime appointment_datetime
        string status
        text notes
    }
    PATIENT ||--o{ APPOINTMENT : books
    DOCTOR ||--o{ APPOINTMENT : conducts`;
  }
  
  if (lower.includes('ecommerce') || lower.includes('shop') || lower.includes('store') || lower.includes('product')) {
    return `erDiagram
    USER {
        int user_id PK
        string username
        string email
        string password_hash
        datetime created_at
    }
    PRODUCT {
        int product_id PK
        string name
        text description
        decimal price
        int stock_quantity
    }
    ORDER {
        int order_id PK
        int user_id FK
        datetime order_date
        decimal total_amount
        string status
    }
    ORDER_ITEM {
        int order_item_id PK
        int order_id FK
        int product_id FK
        int quantity
        decimal unit_price
    }
    USER ||--o{ ORDER : places
    ORDER ||--o{ ORDER_ITEM : contains
    PRODUCT ||--o{ ORDER_ITEM : includes`;
  }
  
  return `erDiagram
    USER {
        int id PK
        string name
        string email
        datetime created_at
    }
    ITEM {
        int id PK
        string title
        text description
        int user_id FK
        datetime created_at
    }
    USER ||--o{ ITEM : owns`;
}

// Parse existing diagram to understand structure
function parseExistingDiagram(diagramCode) {
  const entities = [];
  const lines = diagramCode.split('\n');
  let currentEntity = null;
  
  for (const line of lines) {
    const trimmed = line.trim();
    
    // Check for entity definition
    const entityMatch = trimmed.match(/^([A-Z_]+)\s*\{/);
    if (entityMatch) {
      currentEntity = {
        name: entityMatch[1],
        fields: []
      };
      entities.push(currentEntity);
      continue;
    }
    
    // Check for field definition
    if (currentEntity && trimmed && !trimmed.includes('}') && !trimmed.includes('||--')) {
      currentEntity.fields.push(trimmed);
    }
    
    // Reset when entity ends
    if (trimmed === '}') {
      currentEntity = null;
    }
  }
  
  return entities;
}

// Generate a new table based on user input and existing context
function generateNewTable(tableName, existingEntities) {
  const normalizedName = tableName.toUpperCase();
  const lowerName = tableName.toLowerCase();
  
  console.log(`🔨 Generating new table: ${normalizedName}`);
  
  // Start with basic table structure
  let newTable = `    ${normalizedName} {
        int ${lowerName}_id PK
        string name`;
  
  // Add fields based on table type
  const tableTypeFields = {
    'review': ['int rating', 'text comment', 'datetime created_at'],
    'category': ['string description', 'string slug'],
    'payment': ['decimal amount', 'string payment_method', 'string status', 'datetime processed_at'],
    'address': ['string street', 'string city', 'string state', 'string zip_code', 'string country'],
    'inventory': ['int quantity', 'int min_threshold', 'datetime last_updated'],
    'supplier': ['string company_name', 'string contact_person', 'string email', 'string phone'],
    'pharmacy': ['string address', 'string phone', 'string license_number'],
    'prescription': ['text medication', 'string dosage', 'text instructions', 'datetime prescribed_date'],
    'department': ['string description', 'string location']
  };
  
  // Add specific fields for this table type
  if (tableTypeFields[lowerName]) {
    tableTypeFields[lowerName].forEach(field => {
      newTable += `\n        ${field}`;
    });
  } else {
    // Generic fields for unknown table types
    newTable += `\n        text description\n        datetime created_at`;
  }
  
  // Find potential foreign key connections
  const connections = findPotentialConnections(tableName, existingEntities);
  console.log(`🔗 Found potential connections for ${normalizedName}:`, connections);
  
  // Add foreign keys
  connections.forEach(connectionEntity => {
    const fkName = connectionEntity.toLowerCase() + '_id';
    newTable += `\n        int ${fkName} FK`;
  });
  
  newTable += '\n    }';
  
  // Add relationships
  connections.forEach(connectionEntity => {
    const relationship = determineRelationshipType(tableName, connectionEntity.toLowerCase());
    newTable += `\n    ${connectionEntity} ${relationship} ${normalizedName} : ${determineRelationshipLabel(connectionEntity.toLowerCase(), tableName)}`;
  });
  
  console.log(`✅ Generated table structure for ${normalizedName}`);
  return newTable;
}

// Determine relationship type between entities
function determineRelationshipType(newTable, existingTable) {
  const relationships = {
    'user_to_many': '||--o{',
    'one_to_one': '||--||',
    'many_to_many': '}o--o{'
  };
  
  // Most cases are one-to-many from existing to new
  return relationships.user_to_many;
}

// Determine relationship label
function determineRelationshipLabel(fromEntity, toEntity) {
  const labels = {
    'user': { 'review': 'writes', 'order': 'places', 'payment': 'makes', 'address': 'lives_at' },
    'product': { 'review': 'receives', 'category': 'belongs_to', 'inventory': 'has_stock' },
    'order': { 'payment': 'paid_by', 'item': 'contains' },
    'patient': { 'prescription': 'receives', 'appointment': 'schedules' },
    'doctor': { 'prescription': 'prescribes', 'appointment': 'has' },
    'pharmacy': { 'prescription': 'fills' }
  };
  
  return labels[fromEntity]?.[toEntity] || 'has';
}

// Find entities that might logically connect to the new table
function findPotentialConnections(newTableName, existingEntities) {
  const connections = [];
  const newName = newTableName.toLowerCase();
  
  // Common connection patterns
  const connectionRules = {
    'user': ['USER', 'CUSTOMER', 'PATIENT', 'DOCTOR'],
    'patient': ['DOCTOR', 'HOSPITAL'],
    'order': ['USER', 'CUSTOMER'],
    'product': ['CATEGORY', 'SUPPLIER'],
    'appointment': ['PATIENT', 'DOCTOR'],
    'review': ['USER', 'PRODUCT'],
    'payment': ['ORDER', 'USER'],
    'prescription': ['PATIENT', 'DOCTOR']
  };
  
  // Check if any existing entities should connect to this new table
  existingEntities.forEach(entity => {
    const entityName = entity.name.toLowerCase();
    
    // Check direct rules
    if (connectionRules[newName] && connectionRules[newName].includes(entity.name)) {
      connections.push(entity.name);
    }
    
    // Check reverse rules
    Object.keys(connectionRules).forEach(key => {
      if (entityName.includes(key) && connectionRules[key].includes(newName.toUpperCase())) {
        connections.push(entity.name);
      }
    });
  });
  
  return [...new Set(connections)]; // Remove duplicates
}

// Enhanced table name extraction from user input
function extractTableNameFromInput(input) {
  const lower = input.toLowerCase();
  
  // Pattern 1: "add a [table] table" or "add [table]"
  const addPatterns = [
    /add (?:a |an )?(\w+) table/i,
    /add (?:a |an )?table (?:called |named )?(\w+)/i,
    /add (?:a |an )?(\w+)(?:\s|$)/i,
    /include (?:a |an )?(\w+) table/i,
    /include (?:a |an )?(\w+)(?:\s|$)/i,
    /create (?:a |an )?(\w+) table/i,
    /need (?:a |an )?(\w+) table/i,
    /want (?:a |an )?(\w+) table/i
  ];
  
  // Try each pattern
  for (const pattern of addPatterns) {
    const match = input.match(pattern);
    if (match && match[1]) {
      const tableName = match[1].toLowerCase();
      // Filter out common words that aren't table names
      const stopWords = ['new', 'another', 'more', 'also', 'table', 'entity', 'and', 'or', 'the', 'a', 'an'];
      if (!stopWords.includes(tableName)) {
        return tableName;
      }
    }
  }
  
  // Pattern 2: Look for common entity names in the input
  const commonEntities = [
    'user', 'users', 'customer', 'customers', 'client', 'clients',
    'product', 'products', 'item', 'items', 'order', 'orders',
    'payment', 'payments', 'review', 'reviews', 'comment', 'comments',
    'category', 'categories', 'tag', 'tags', 'address', 'addresses',
    'invoice', 'invoices', 'bill', 'bills', 'receipt', 'receipts',
    'appointment', 'appointments', 'booking', 'bookings',
    'patient', 'patients', 'doctor', 'doctors', 'nurse', 'nurses',
    'medication', 'medications', 'prescription', 'prescriptions',
    'department', 'departments', 'employee', 'employees',
    'supplier', 'suppliers', 'vendor', 'vendors', 'warehouse', 'warehouses',
    'inventory', 'stock', 'shipment', 'shipments', 'delivery', 'deliveries'
  ];
  
  const words = lower.split(/\s+/);
  for (const word of words) {
    if (commonEntities.includes(word)) {
      // Convert plural to singular
      return word.endsWith('s') ? word.slice(0, -1) : word;
    }
  }
  
  return null;
}

// Health check
app.get('/api/ping', (req, res) => {
  console.log('✅ Ping endpoint hit');
  
  res.json({ 
    message: 'ChartGenie Conversational Server is live!', 
    timestamp: new Date().toISOString(),
    supportedFormats: Object.values(OUTPUT_FORMATS),
    groqConfigured: !!GROQ_API_KEY,
    mode: 'CONVERSATIONAL_GROQ',
    activeSessions: conversationSessions.size
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
    
    const response = await callGroq('Create a simple erDiagram with User and Post entities. Output only mermaid syntax.');
    
    res.json({
      status: 'success',
      provider: 'groq',
      model: 'llama3-8b-8192',
      response: response.substring(0, 200),
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

// Main conversational diagram generation endpoint
app.post('/api/diagram', async (req, res) => {
  console.log('🔥 Conversational diagram request:', req.body);
  
  const { 
    message: userPrompt, 
    format = 'mermaid',
    sessionId = null,
    currentDiagram = null 
  } = req.body;
  
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

  const prompt = createConversationalPrompt(userPrompt, format, session.history, session.currentDiagram);

  try {
    console.log('💬 Using Groq for conversational diagram...');
    console.log('🔍 Is modification request:', detectModificationIntent(userPrompt, session.currentDiagram));
    console.log('📝 Current diagram exists:', !!session.currentDiagram);
    
    const response = await callGroq(prompt);
    
    if (!response || response.length < 10) {
      console.log('⚠️ Groq generated short response, using conversational fallback');
      const fallbackCode = generateConversationalFallback(userPrompt, session.history, session.currentDiagram);
      
      const result = { 
        diagramCode: fallbackCode,
        format,
        source: 'conversational_fallback',
        message: 'Generated using conversational fallback template',
        provider: 'template',
        sessionId: session.id
      };
      
      // Update session
      session.currentDiagram = fallbackCode;
      session.history.push({
        userMessage: userPrompt,
        assistantSummary: summarizeExchange(userPrompt, fallbackCode),
        timestamp: new Date()
      });
      conversationSessions.set(session.id, session);
      
      cache.set(cacheKey, result);
      return res.json(result);
    }

    // Basic cleanup and validation
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

    // Validate modification requests preserve existing entities
    const isModificationRequest = detectModificationIntent(userPrompt, session.currentDiagram);
    if (isModificationRequest && session.currentDiagram) {
      console.log('🔍 Validating that AI preserved existing entities...');
      const preservedCorrectly = validateModificationPreservesEntities(diagramCode, session.currentDiagram);
      if (!preservedCorrectly) {
        console.log('❌ AI did not preserve existing entities, using smart fallback');
        diagramCode = generateConversationalFallback(userPrompt, session.history, session.currentDiagram);
      } else {
        console.log('✅ AI correctly preserved existing entities');
      }
    }

    // Final validation - if still invalid, use conversational fallback
    if (!diagramCode.includes('erDiagram') || diagramCode.split('\n').length < 3) {
      console.log('⚠️ Invalid diagram structure, using conversational fallback');
      diagramCode = generateConversationalFallback(userPrompt, session.history, session.currentDiagram);
    }

    console.log('✅ Final diagram code length:', diagramCode.length);
    console.log('📊 Final entities:', extractEntitiesFromDiagram(diagramCode));
    
    const result = { 
      diagramCode,
      format,
      source: 'groq_conversational',
      message: 'Generated by Groq with conversation context',
      provider: 'groq',
      model: 'llama3-8b-8192',
      sessionId: session.id
    };
    
    // Update session with new exchange
    session.currentDiagram = diagramCode;
    session.history.push({
      userMessage: userPrompt,
      assistantSummary: summarizeExchange(userPrompt, diagramCode),
      timestamp: new Date()
    });
    
    // Keep only last 10 exchanges to prevent memory bloat
    if (session.history.length > 10) {
      session.history = session.history.slice(-10);
    }
    
    conversationSessions.set(session.id, session);
    
    // Cache successful results
    cache.set(cacheKey, result);
    
    return res.json(result);

  } catch (error) {
    console.error('❌ Groq Conversational Error:', error.message);
    
    // Always provide conversational fallback
    const fallbackCode = generateConversationalFallback(userPrompt, session.history, session.currentDiagram);
    
    const result = { 
      diagramCode: fallbackCode,
      format,
      source: 'conversational_fallback_on_error',
      message: 'Generated using conversational fallback due to API error',
      provider: 'template',
      originalError: error.message,
      sessionId: session.id
    };
    
    // Update session even on error
    session.currentDiagram = fallbackCode;
    session.history.push({
      userMessage: userPrompt,
      assistantSummary: summarizeExchange(userPrompt, fallbackCode),
      timestamp: new Date()
    });
    conversationSessions.set(session.id, session);
    
    return res.json(result);
  }
});

// Get conversation history
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

// Clear conversation
app.delete('/api/conversation/:sessionId', (req, res) => {
  const { sessionId } = req.params;
  conversationSessions.delete(sessionId);
  res.json({ message: 'Conversation cleared' });
});

// List active sessions
app.get('/api/sessions', (req, res) => {
  const sessions = Array.from(conversationSessions.entries()).map(([id, session]) => ({
    id,
    createdAt: session.createdAt,
    messageCount: session.history.length,
    lastActivity: session.history.length > 0 ? session.history[session.history.length - 1].timestamp : session.createdAt
  }));
  
  res.json({ sessions, count: sessions.length });
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
    mode: 'CONVERSATIONAL_GROQ'
  });
});

// Cache management
app.delete('/api/cache', (req, res) => {
  cache.flushAll();
  res.json({ message: 'Cache cleared successfully' });
});

app.listen(PORT, () => {
  console.log(`🚀 ChartGenie Conversational Server running at http://localhost:${PORT}`);
  console.log(`🔑 Groq API Key: ${GROQ_API_KEY ? 'Configured' : 'Missing'}`);
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
  
  if (!GROQ_API_KEY) {
    console.log('\n⚠️  Setup Instructions:');
    console.log('   1. Go to: https://console.groq.com/keys');
    console.log('   2. Sign up (free)');
    console.log('   3. Create API key');
    console.log('   4. Add to .env: GROQ_API_KEY=your_key_here');
  }
});