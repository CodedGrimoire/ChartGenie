const { CONFIG, GROQ_CONFIG } = require('./config');

/**
 * Call Groq API with the given prompt
 * @param {string} prompt - The prompt to send to Groq
 * @returns {Promise<string>} - The response from Groq
 */
async function callGroq(prompt) {
  if (!CONFIG.GROQ_API_KEY) {
    throw new Error('No Groq API key configured');
  }

  try {
    const response = await fetch(GROQ_CONFIG.BASE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${CONFIG.GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: GROQ_CONFIG.MODEL,
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
        max_tokens: GROQ_CONFIG.MAX_TOKENS,
        temperature: GROQ_CONFIG.TEMPERATURE
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

/**
 * Test Groq API connection
 * @returns {Promise<Object>} - Test result
 */
async function testGroqConnection() {
  if (!CONFIG.GROQ_API_KEY) {
    return {
      status: 'error',
      error: 'No Groq API key',
      message: 'Set GROQ_API_KEY in .env file',
      signup: 'https://console.groq.com/keys'
    };
  }

  try {
    console.log('🧪 Testing Groq...');
    
    const response = await callGroq('Create a simple erDiagram with User and Post entities. Output only mermaid syntax.');
    
    return {
      status: 'success',
      provider: 'groq',
      model: GROQ_CONFIG.MODEL,
      response: response.substring(0, 200),
      timestamp: new Date().toISOString()
    };
    
  } catch (error) {
    console.error('❌ Groq test failed:', error.message);
    return {
      status: 'error',
      provider: 'groq',
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
}

module.exports = {
  callGroq,
  testGroqConnection
};