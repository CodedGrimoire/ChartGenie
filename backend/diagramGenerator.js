const { callGroq } = require('./groqService');
const { getTemplateByKeywords } = require('./templates');
const { cleanDiagramCode, validateDiagramStructure, extractDiagramFromResponse } = require('./trimmer');
const { 
  detectModificationIntent, 
  extractTableNameFromInput, 
  parseExistingDiagram, 
  generateNewTable,
  validateModificationPreservesEntities 
} = require('./utils');
const { CONFIG } = require('./config');

/**
 * Create a conversational prompt based on user input and history
 * @param {string} userInput - User's message
 * @param {string} outputFormat - Desired output format
 * @param {Array} conversationHistory - Previous conversation exchanges
 * @param {string} currentDiagram - Current diagram state
 * @returns {string} - Generated prompt for AI
 */
function createConversationalPrompt(userInput, outputFormat, conversationHistory, currentDiagram) {
  const history = conversationHistory.slice(-CONFIG.CONTEXT_HISTORY_SIZE); // Keep last 3 exchanges for context
  
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

/**
 * Generate conversational fallback when AI fails
 * @param {string} userInput - User input
 * @param {Array} conversationHistory - Conversation history
 * @param {string} currentDiagram - Current diagram
 * @returns {string} - Fallback diagram code
 */
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
  return getTemplateByKeywords(userInput);
}

/**
 * Main diagram generation function
 * @param {Object} params - Generation parameters
 * @returns {Promise<Object>} - Generation result
 */
async function generateDiagram({
  userPrompt,
  format = 'mermaid',
  conversationHistory = [],
  currentDiagram = null
}) {
  console.log('🔥 Generating diagram with prompt:', userPrompt);
  
  const prompt = createConversationalPrompt(userPrompt, format, conversationHistory, currentDiagram);
  
  try {
    console.log('💬 Using Groq for conversational diagram...');
    console.log('🔍 Is modification request:', detectModificationIntent(userPrompt, currentDiagram));
    console.log('📝 Current diagram exists:', !!currentDiagram);
    
    const response = await callGroq(prompt);
    
    if (!response || response.length < 10) {
      console.log('⚠️ Groq generated short response, using conversational fallback');
      const fallbackCode = generateConversationalFallback(userPrompt, conversationHistory, currentDiagram);
      
      return {
        diagramCode: fallbackCode,
        format,
        source: 'conversational_fallback',
        message: 'Generated using conversational fallback template',
        provider: 'template'
      };
    }

    // Clean and extract diagram code
    let diagramCode = cleanDiagramCode(response, format);
    
    // Additional extraction if needed
    if (!diagramCode.includes('erDiagram')) {
      diagramCode = extractDiagramFromResponse(response, format);
    }

    // Validate modification requests preserve existing entities
    const isModificationRequest = detectModificationIntent(userPrompt, currentDiagram);
    if (isModificationRequest && currentDiagram) {
      console.log('🔍 Validating that AI preserved existing entities...');
      const preservedCorrectly = validateModificationPreservesEntities(diagramCode, currentDiagram);
      if (!preservedCorrectly) {
        console.log('❌ AI did not preserve existing entities, using smart fallback');
        diagramCode = generateConversationalFallback(userPrompt, conversationHistory, currentDiagram);
      } else {
        console.log('✅ AI correctly preserved existing entities');
      }
    }

    // Final validation - if still invalid, use conversational fallback
    const validation = validateDiagramStructure(diagramCode, format);
    if (!validation.valid) {
      console.log('⚠️ Invalid diagram structure, using conversational fallback');
      diagramCode = generateConversationalFallback(userPrompt, conversationHistory, currentDiagram);
    }

    console.log('✅ Final diagram code length:', diagramCode.length);
    
    return {
      diagramCode,
      format,
      source: 'groq_conversational',
      message: 'Generated by Groq with conversation context',
      provider: 'groq',
      model: 'llama3-8b-8192'
    };

  } catch (error) {
    console.error('❌ Diagram Generation Error:', error.message);
    
    // Always provide conversational fallback
    const fallbackCode = generateConversationalFallback(userPrompt, conversationHistory, currentDiagram);
    
    return {
      diagramCode: fallbackCode,
      format,
      source: 'conversational_fallback_on_error',
      message: 'Generated using conversational fallback due to API error',
      provider: 'template',
      originalError: error.message
    };
  }
}

module.exports = {
  generateDiagram,
  createConversationalPrompt,
  generateConversationalFallback
};