const { OUTPUT_FORMATS, CONFIG } = require('./config');

// Input validation
function validateInput(input, format = 'mermaid') {
  if (!input || typeof input !== 'string') return { valid: false, error: 'Invalid input' };
  if (input.length > CONFIG.MAX_INPUT_LENGTH) return { valid: false, error: 'Input too long' };
  if (!Object.values(OUTPUT_FORMATS).includes(format)) {
    return { valid: false, error: 'Unsupported output format' };
  }
  return { valid: true };
}

// Extract entity names from mermaid diagram
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

// Validate that modifications preserve existing entities
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

module.exports = {
  validateInput,
  extractEntitiesFromDiagram,
  detectModificationIntent,
  summarizeExchange,
  validateModificationPreservesEntities,
  extractTableNameFromInput
};