const { ENV, CONFIG } = require('./config');
const { detectModificationIntent } = require('./utils');

// Enhanced conversation-aware prompt creation
function createConversationalPrompt(userInput, outputFormat, conversationHistory, currentDiagram) {
  const history = conversationHistory.slice(-CONFIG.MAX_CONTEXT_EXCHANGES); // Keep last 3 exchanges for context
  
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

// Call Groq API
async function callGroq(prompt) {
  if (!ENV.GROQ_API_KEY) {
    throw new Error('No Groq API key configured');
  }

  try {
    const response = await fetch(CONFIG.GROQ_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ENV.GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: CONFIG.GROQ_MODEL,
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
        max_tokens: CONFIG.MAX_TOKENS,
        temperature: CONFIG.TEMPERATURE
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

module.exports = {
  createConversationalPrompt,
  callGroq
};