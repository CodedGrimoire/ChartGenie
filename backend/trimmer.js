// trimmer.js - Aggressive diagram code extraction and cleaning

/**
 * Aggressively extract clean diagram code from AI-generated responses
 * Removes explanations, thinking process, markdown, and extra text
 */

function trimDiagramCode(rawCode, format = 'mermaid') {
  if (!rawCode || typeof rawCode !== 'string') {
    console.log('⚠️ Trimmer: No code provided');
    return '';
  }

  console.log('🔄 Trimmer: Processing raw code...', rawCode.substring(0, 100) + '...');

  let cleaned = rawCode;

  // Step 1: Remove common wrapper patterns
  cleaned = cleaned
    .replace(/<think>.*?<\/think>/gs, '') // Remove thinking blocks
    .replace(/```mermaid\s*/gi, '')
    .replace(/```latex\s*/gi, '')
    .replace(/```tikz\s*/gi, '')
    .replace(/```plantuml\s*/gi, '')
    .replace(/```\s*/g, '')
    .replace(/^\s*```.*$/gm, '') // Remove any remaining code fence lines
    .trim();

  // Step 2: Remove common explanation patterns
  const explanationPatterns = [
    /^.*?Here's.*?diagram.*?:/i,
    /^.*?Here is.*?diagram.*?:/i,
    /^.*?This.*?diagram.*?:/i,
    /^.*?The.*?diagram.*?:/i,
    /^.*?I'll create.*?:/i,
    /^.*?Let me create.*?:/i,
    /^.*?Below is.*?:/i,
    /^.*?Above.*?:/i,
    /Note:.*$/gm,
    /Explanation:.*$/gm,
    /Description:.*$/gm,
    /This diagram.*$/gm,
    /The above.*$/gm,
    /As you can see.*$/gm,
    /^\/\/.*$/gm, // Remove comment lines
    /^#.*$/gm,    // Remove markdown headers
  ];

  explanationPatterns.forEach(pattern => {
    cleaned = cleaned.replace(pattern, '');
  });

  // Step 3: Format-specific extraction
  if (format === 'mermaid') {
    cleaned = extractMermaidCode(cleaned);
  } else if (format === 'tikz' || format === 'pgf') {
    cleaned = extractLatexCode(cleaned, format);
  } else if (format === 'plantuml') {
    cleaned = extractPlantUMLCode(cleaned);
  }

  // Step 4: Final cleanup
  cleaned = cleaned
    .replace(/^\s*[\r\n]+/gm, '') // Remove empty lines at start
    .replace(/[\r\n]+\s*$/gm, '') // Remove empty lines at end
    .trim();

  console.log('✨ Trimmer: Final result:', cleaned.substring(0, 150) + '...');
  
  return cleaned;
}

function extractMermaidCode(text) {
  const validStarts = [
    'graph', 'flowchart', 'erdiagram', 'classdiagram', 
    'sequencediagram', 'pie', 'journey', 'gitgraph',
    'gantt', 'mindmap', 'timeline', 'sankey'
  ];

  // Find the start of the actual diagram
  const lines = text.split('\n');
  let diagramStart = -1;
  let diagramEnd = lines.length;

  // Find diagram start
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim().toLowerCase();
    if (validStarts.some(start => line.startsWith(start))) {
      diagramStart = i;
      break;
    }
  }

  if (diagramStart === -1) {
    console.log('⚠️ Trimmer: No valid Mermaid diagram start found');
    return text; // Return as-is if no valid start found
  }

  // Find diagram end (look for explanatory text or obvious end markers)
  for (let i = diagramStart + 1; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // Skip empty lines
    if (line === '') continue;
    
    // End markers
    if (
      line.toLowerCase().includes('explanation') ||
      line.toLowerCase().includes('this diagram') ||
      line.toLowerCase().includes('the above') ||
      line.toLowerCase().includes('note:') ||
      line.toLowerCase().includes('description:') ||
      line.startsWith('//') ||
      line.startsWith('#') ||
      line.startsWith('*') ||
      line.startsWith('-') && !line.includes('-->') ||
      (line.length > 100 && 
       !line.includes('-->') && 
       !line.includes('||--') && 
       !line.includes('{') && 
       !line.includes('}') &&
       !line.includes('|'))
    ) {
      diagramEnd = i;
      break;
    }
  }

  const result = lines.slice(diagramStart, diagramEnd)
    .join('\n')
    .trim();

  console.log('🔍 Mermaid extracted:', result.substring(0, 100) + '...');
  return result;
}

function extractLatexCode(text, format) {
  // Find \begin{tikzpicture} or similar
  const beginPattern = format === 'tikz' ? 
    /\\begin\{tikzpicture\}/i : 
    /\\begin\{pgfpicture\}/i;
  
  const endPattern = format === 'tikz' ? 
    /\\end\{tikzpicture\}/i : 
    /\\end\{pgfpicture\}/i;

  const startMatch = text.match(beginPattern);
  const endMatch = text.match(endPattern);

  if (startMatch && endMatch) {
    const start = startMatch.index;
    const end = endMatch.index + endMatch[0].length;
    return text.substring(start, end).trim();
  }

  // If no proper delimiters, return cleaned text
  return text.replace(/^.*?\\begin/s, '\\begin').trim();
}

function extractPlantUMLCode(text) {
  // Look for @startuml and @enduml
  const startMatch = text.match(/@startuml/i);
  const endMatch = text.match(/@enduml/i);

  if (startMatch && endMatch) {
    const start = startMatch.index;
    const end = endMatch.index + endMatch[0].length;
    return text.substring(start, end).trim();
  }

  // If no proper delimiters, try to find class/participant definitions
  const lines = text.split('\n');
  let diagramStart = -1;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim().toLowerCase();
    if (line.startsWith('class ') || 
        line.startsWith('participant ') ||
        line.startsWith('actor ') ||
        line.includes(' -> ') ||
        line.includes(' --> ')) {
      diagramStart = i;
      break;
    }
  }

  if (diagramStart >= 0) {
    return lines.slice(diagramStart).join('\n').trim();
  }

  return text;
}

function validateDiagramCode(code, format) {
  if (!code || code.length < 5) {
    return { valid: false, reason: 'Code too short' };
  }

  if (format === 'mermaid') {
    const validStarts = ['graph', 'flowchart', 'erdiagram', 'classdiagram', 'sequencediagram'];
    const hasValidStart = validStarts.some(start => 
      code.toLowerCase().trim().startsWith(start)
    );
    
    if (!hasValidStart) {
      return { valid: false, reason: 'Invalid Mermaid diagram type' };
    }

    // Check for basic Mermaid syntax
    if (format === 'mermaid' && 
        !code.includes('{') && 
        !code.includes('-->') && 
        !code.includes('||--') &&
        !code.includes('[') &&
        !code.includes('(')) {
      return { valid: false, reason: 'Missing Mermaid syntax elements' };
    }
  }

  if (format === 'tikz' && !code.includes('\\begin{tikzpicture}')) {
    return { valid: false, reason: 'Missing TikZ structure' };
  }

  if (format === 'plantuml' && !code.includes('@start') && !code.includes('->') && !code.includes('class ')) {
    return { valid: false, reason: 'Missing PlantUML syntax' };
  }

  return { valid: true };
}

// Clean up obvious AI artifacts
function removeAIArtifacts(text) {
  return text
    .replace(/^(Sure,?|Certainly,?|Of course,?)/i, '')
    .replace(/^(Here's|Here is)/i, '')
    .replace(/^(I'll|I will)/i, '')
    .replace(/^(Let me)/i, '')
    .replace(/\b(AI|artificial intelligence|language model)\b/gi, '')
    .trim();
}

module.exports = {
  trimDiagramCode,
  validateDiagramCode,
  removeAIArtifacts
};