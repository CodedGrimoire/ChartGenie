/**
 * Functions for cleaning and processing diagram code
 */

/**
 * Clean and normalize diagram code from AI response
 * @param {string} response - Raw response from AI
 * @param {string} format - Expected diagram format
 * @returns {string} - Cleaned diagram code
 */
function cleanDiagramCode(response, format = 'mermaid') {
  if (!response) return '';
  
  // Basic cleanup - remove code blocks
  let diagramCode = response
    .replace(/```mermaid/gi, '')
    .replace(/```tikz/gi, '')
    .replace(/```plantuml/gi, '')
    .replace(/```/g, '')
    .trim();
  
  // Format-specific cleanup
  if (format === 'mermaid') {
    return cleanMermaidCode(diagramCode);
  }
  
  return diagramCode;
}

/**
 * Clean and validate Mermaid diagram code
 * @param {string} code - Raw mermaid code
 * @returns {string} - Cleaned mermaid code
 */
function cleanMermaidCode(code) {
  if (!code) return '';
  
  const lines = code.split('\n');
  
  // Find the start of the diagram
  const diagramStart = lines.findIndex(line => 
    line.trim().toLowerCase().startsWith('erdiagram')
  );
  
  if (diagramStart >= 0) {
    code = lines.slice(diagramStart).join('\n').trim();
    // Normalize the erDiagram declaration
    code = code.replace(/^erdiagram/i, 'erDiagram');
  }
  
  return code;
}

/**
 * Validate diagram structure
 * @param {string} diagramCode - Diagram code to validate
 * @param {string} format - Expected format
 * @returns {Object} - Validation result
 */
function validateDiagramStructure(diagramCode, format = 'mermaid') {
  if (!diagramCode || typeof diagramCode !== 'string') {
    return { valid: false, error: 'Empty or invalid diagram code' };
  }
  
  if (format === 'mermaid') {
    return validateMermaidStructure(diagramCode);
  }
  
  return { valid: true };
}

/**
 * Validate Mermaid diagram structure
 * @param {string} code - Mermaid diagram code
 * @returns {Object} - Validation result
 */
function validateMermaidStructure(code) {
  // Check for erDiagram declaration
  if (!code.includes('erDiagram')) {
    return { valid: false, error: 'Missing erDiagram declaration' };
  }
  
  // Check minimum structure (should have at least a few lines)
  const lines = code.split('\n').filter(line => line.trim());
  if (lines.length < 3) {
    return { valid: false, error: 'Diagram too simple or malformed' };
  }
  
  // Check for at least one entity
  const hasEntity = lines.some(line => 
    line.trim().match(/^[A-Z_][A-Z0-9_]*\s*\{/)
  );
  
  if (!hasEntity) {
    return { valid: false, error: 'No entities found in diagram' };
  }
  
  return { valid: true };
}

/**
 * Extract and clean diagram from multi-line response
 * @param {string} response - Full AI response
 * @param {string} format - Expected format
 * @returns {string} - Extracted diagram code
 */
function extractDiagramFromResponse(response, format = 'mermaid') {
  if (!response) return '';
  
  const lines = response.split('\n');
  let diagramLines = [];
  let inDiagram = false;
  let foundStart = false;
  
  for (const line of lines) {
    const trimmed = line.trim().toLowerCase();
    
    // Look for diagram start
    if (!foundStart && (
      trimmed.startsWith('erdiagram') ||
      trimmed.startsWith('digraph') ||
      trimmed.startsWith('@startuml')
    )) {
      foundStart = true;
      inDiagram = true;
      diagramLines.push(line);
      continue;
    }
    
    // If we found start, collect lines until end or empty lines
    if (foundStart && inDiagram) {
      // Stop at code block end or @enduml
      if (trimmed === '```' || trimmed === '@enduml') {
        break;
      }
      
      diagramLines.push(line);
      
      // For mermaid, stop if we hit multiple empty lines
      if (format === 'mermaid' && !trimmed && diagramLines.length > 5) {
        const lastFewLines = diagramLines.slice(-3);
        const allEmpty = lastFewLines.every(l => !l.trim());
        if (allEmpty) break;
      }
    }
  }
  
  return diagramLines.join('\n').trim();
}

/**
 * Normalize entity names in diagram
 * @param {string} code - Diagram code
 * @returns {string} - Code with normalized entity names
 */
function normalizeEntityNames(code) {
  if (!code) return '';
  
  const lines = code.split('\n');
  const normalizedLines = lines.map(line => {
    // Match entity declarations and normalize to uppercase
    const entityMatch = line.match(/^(\s*)([a-zA-Z_][a-zA-Z0-9_]*)\s*(\{.*)$/);
    if (entityMatch) {
      const [, spaces, entityName, rest] = entityMatch;
      return `${spaces}${entityName.toUpperCase()}${rest}`;
    }
    
    // Match relationship lines and normalize entity references
    const relationMatch = line.match(/^(\s*)([a-zA-Z_][a-zA-Z0-9_]*)\s+(\|\|--.*--\|\||\|\|--o\{|o\{--\|\|)\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*:\s*(.*)$/);
    if (relationMatch) {
      const [, spaces, entity1, relation, entity2, label] = relationMatch;
      return `${spaces}${entity1.toUpperCase()} ${relation} ${entity2.toUpperCase()} : ${label}`;
    }
    
    return line;
  });
  
  return normalizedLines.join('\n');
}

/**
 * Remove duplicate relationships from diagram
 * @param {string} code - Diagram code
 * @returns {string} - Code with duplicate relationships removed
 */
function removeDuplicateRelationships(code) {
  if (!code) return '';
  
  const lines = code.split('\n');
  const relationships = new Set();
  const cleanedLines = [];
  
  for (const line of lines) {
    const trimmed = line.trim();
    
    // Check if this is a relationship line
    if (trimmed.includes('||--') || trimmed.includes('o{--') || trimmed.includes('}o--')) {
      // Normalize the relationship for comparison
      const normalized = trimmed.replace(/\s+/g, ' ').toLowerCase();
      
      if (!relationships.has(normalized)) {
        relationships.add(normalized);
        cleanedLines.push(line);
      }
      // Skip duplicate relationships
    } else {
      cleanedLines.push(line);
    }
  }
  
  return cleanedLines.join('\n');
}

module.exports = {
  cleanDiagramCode,
  cleanMermaidCode,
  validateDiagramStructure,
  validateMermaidStructure,
  extractDiagramFromResponse,
  normalizeEntityNames,
  removeDuplicateRelationships
};