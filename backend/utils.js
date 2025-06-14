const { OUTPUT_FORMATS, CONFIG } = require('./config');
const { CONNECTION_RULES, RELATIONSHIP_LABELS, TABLE_TYPE_FIELDS } = require('./templates');

/**
 * Validate user input
 * @param {string} input - User input to validate
 * @param {string} format - Output format
 * @returns {Object} - Validation result
 */
function validateInput(input, format = 'mermaid') {
  if (!input || typeof input !== 'string') return { valid: false, error: 'Invalid input' };
  if (input.length > CONFIG.MAX_INPUT_LENGTH) return { valid: false, error: 'Input too long' };
  if (!Object.values(OUTPUT_FORMATS).includes(format)) {
    return { valid: false, error: 'Unsupported output format' };
  }
  return { valid: true };
}

/**
 * Extract entity names from mermaid diagram
 * @param {string} diagramCode - Mermaid diagram code
 * @returns {Array<string>} - Array of entity names
 */
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

/**
 * Parse existing diagram to understand structure
 * @param {string} diagramCode - Existing diagram code
 * @returns {Array<Object>} - Array of entities with their fields
 */
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

/**
 * Detect if user input is requesting a modification to existing diagram
 * @param {string} userInput - User input
 * @param {string} currentDiagram - Current diagram code
 * @returns {boolean} - Whether this is a modification request
 */
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

/**
 * Extract table name from user input
 * @param {string} input - User input
 * @returns {string|null} - Extracted table name or null
 */
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

/**
 * Find entities that might logically connect to the new table
 * @param {string} newTableName - Name of the new table
 * @param {Array<Object>} existingEntities - Existing entities
 * @returns {Array<string>} - Array of entity names to connect
 */
function findPotentialConnections(newTableName, existingEntities) {
  const connections = [];
  const newName = newTableName.toLowerCase();
  
  // Check if any existing entities should connect to this new table
  existingEntities.forEach(entity => {
    const entityName = entity.name.toLowerCase();
    
    // Check direct rules
    if (CONNECTION_RULES[newName] && CONNECTION_RULES[newName].includes(entity.name)) {
      connections.push(entity.name);
    }
    
    // Check reverse rules
    Object.keys(CONNECTION_RULES).forEach(key => {
      if (entityName.includes(key) && CONNECTION_RULES[key].includes(newName.toUpperCase())) {
        connections.push(entity.name);
      }
    });
  });
  
  return [...new Set(connections)]; // Remove duplicates
}

/**
 * Generate a new table based on user input and existing context
 * @param {string} tableName - Name of the table to generate
 * @param {Array<Object>} existingEntities - Existing entities
 * @returns {string} - Generated table structure
 */
function generateNewTable(tableName, existingEntities) {
  const normalizedName = tableName.toUpperCase();
  const lowerName = tableName.toLowerCase();
  
  console.log(`🔨 Generating new table: ${normalizedName}`);
  
  // Start with basic table structure
  let newTable = `    ${normalizedName} {
        int ${lowerName}_id PK
        string name`;
  
  // Add specific fields for this table type
  if (TABLE_TYPE_FIELDS[lowerName]) {
    TABLE_TYPE_FIELDS[lowerName].forEach(field => {
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
    const relationship = '||--o{'; // Most cases are one-to-many
    const label = RELATIONSHIP_LABELS[connectionEntity.toLowerCase()]?.[tableName] || 'has';
    newTable += `\n    ${connectionEntity} ${relationship} ${normalizedName} : ${label}`;
  });
  
  console.log(`✅ Generated table structure for ${normalizedName}`);
  return newTable;
}

/**
 * Validate that modifications preserve existing entities
 * @param {string} newDiagram - New diagram code
 * @param {string} originalDiagram - Original diagram code
 * @returns {boolean} - Whether entities are preserved
 */
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

/**
 * Extract key information from user message for history
 * @param {string} userMessage - User message
 * @param {string} diagramCode - Generated diagram code
 * @returns {string} - Summary of the exchange
 */
function summarizeExchange(userMessage, diagramCode) {
  const entities = extractEntitiesFromDiagram(diagramCode);
  return `Created diagram with entities: ${entities.join(', ')}`;
}

module.exports = {
  validateInput,
  extractEntitiesFromDiagram,
  parseExistingDiagram,
  detectModificationIntent,
  extractTableNameFromInput,
  findPotentialConnections,
  generateNewTable,
  validateModificationPreservesEntities,
  summarizeExchange
};