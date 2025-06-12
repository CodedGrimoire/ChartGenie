const { detectModificationIntent, extractTableNameFromInput } = require('./utils');

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

module.exports = {
  parseExistingDiagram,
  findPotentialConnections,
  determineRelationshipType,
  determineRelationshipLabel,
  generateNewTable,
  generateConversationalFallback
};