/**
 * Safe Math Expression Evaluator
 * 
 * This module provides a safe way to evaluate mathematical expressions
 * without using eval() or Function() constructor, which are vulnerable
 * to code injection attacks.
 * 
 * It supports basic arithmetic operations: +, -, *, /, and parentheses.
 */

type Token = {
  type: 'number' | 'operator' | 'lparen' | 'rparen';
  value: string | number;
};

/**
 * Tokenize a mathematical expression
 */
function tokenize(expression: string): Token[] {
  const tokens: Token[] = [];
  let current = 0;
  
  while (current < expression.length) {
    const char = expression[current];
    
    // Skip whitespace
    if (/\s/.test(char)) {
      current++;
      continue;
    }
    
    // Handle numbers (including decimals)
    if (/[\d.]/.test(char)) {
      let value = '';
      while (current < expression.length && /[\d.]/.test(expression[current])) {
        value += expression[current];
        current++;
      }
      tokens.push({ type: 'number', value: parseFloat(value) });
      continue;
    }
    
    // Handle operators
    if (['+', '-', '*', '/'].includes(char)) {
      // Handle negative numbers at start or after operator/lparen
      if (char === '-' && (tokens.length === 0 || 
          tokens[tokens.length - 1].type === 'operator' ||
          tokens[tokens.length - 1].type === 'lparen')) {
        current++;
        let value = '-';
        while (current < expression.length && /[\d.]/.test(expression[current])) {
          value += expression[current];
          current++;
        }
        if (value.length > 1) {
          tokens.push({ type: 'number', value: parseFloat(value) });
          continue;
        }
        // If no number follows, treat as regular minus operator
        current--;
      }
      tokens.push({ type: 'operator', value: char });
      current++;
      continue;
    }
    
    // Handle parentheses
    if (char === '(') {
      tokens.push({ type: 'lparen', value: '(' });
      current++;
      continue;
    }
    
    if (char === ')') {
      tokens.push({ type: 'rparen', value: ')' });
      current++;
      continue;
    }
    
    // Unknown character - skip it
    current++;
  }
  
  return tokens;
}

/**
 * Parse and evaluate tokens using recursive descent parser
 * Implements operator precedence: () > * / > + -
 */
function evaluateTokens(tokens: Token[]): number {
  let pos = 0;
  
  function parseExpression(): number {
    let left = parseTerm();
    
    while (pos < tokens.length) {
      const token = tokens[pos];
      if (token.type === 'operator' && (token.value === '+' || token.value === '-')) {
        pos++;
        const right = parseTerm();
        if (token.value === '+') {
          left = left + right;
        } else {
          left = left - right;
        }
      } else {
        break;
      }
    }
    
    return left;
  }
  
  function parseTerm(): number {
    let left = parseFactor();
    
    while (pos < tokens.length) {
      const token = tokens[pos];
      if (token.type === 'operator' && (token.value === '*' || token.value === '/')) {
        pos++;
        const right = parseFactor();
        if (token.value === '*') {
          left = left * right;
        } else {
          if (right === 0) {
            throw new Error('Division by zero');
          }
          left = left / right;
        }
      } else {
        break;
      }
    }
    
    return left;
  }
  
  function parseFactor(): number {
    const token = tokens[pos];
    
    if (!token) {
      throw new Error('Unexpected end of expression');
    }
    
    if (token.type === 'number') {
      pos++;
      return token.value as number;
    }
    
    if (token.type === 'lparen') {
      pos++; // skip '('
      const result = parseExpression();
      if (tokens[pos]?.type !== 'rparen') {
        throw new Error('Missing closing parenthesis');
      }
      pos++; // skip ')'
      return result;
    }
    
    throw new Error(`Unexpected token: ${JSON.stringify(token)}`);
  }
  
  const result = parseExpression();
  
  if (pos < tokens.length) {
    throw new Error('Unexpected tokens at end of expression');
  }
  
  return result;
}

/**
 * Normalize a mathematical expression by replacing various symbols
 */
function normalizeExpression(expression: string): string {
  return expression
    .replace(/×/g, '*')
    .replace(/÷/g, '/')
    .replace(/:/g, '/')
    .replace(/,/g, '.')
    .replace(/\s+/g, '');
}

/**
 * Validate that expression only contains safe characters
 */
function validateExpression(expression: string): boolean {
  // Only allow digits, basic operators, parentheses, decimal points, and whitespace
  return /^[\d+\-*/.(),\s]+$/.test(expression);
}

/**
 * Safely evaluate a mathematical expression
 * Returns the result or null if evaluation fails
 */
export function safeMathEvaluate(expression: string): number | null {
  try {
    if (!expression || typeof expression !== 'string') {
      return null;
    }
    
    const normalized = normalizeExpression(expression);
    
    if (!normalized || !validateExpression(normalized)) {
      return null;
    }
    
    const tokens = tokenize(normalized);
    
    if (tokens.length === 0) {
      return null;
    }
    
    const result = evaluateTokens(tokens);
    
    if (!isFinite(result)) {
      return null;
    }
    
    return result;
  } catch (error) {
    return null;
  }
}

/**
 * Safely evaluate a mathematical expression and round to specified decimals
 */
export function safeMathEvaluateRounded(expression: string, decimals: number = 2): number | null {
  const result = safeMathEvaluate(expression);
  
  if (result === null) {
    return null;
  }
  
  const factor = Math.pow(10, decimals);
  return Math.round(result * factor) / factor;
}

/**
 * Validate if a mathematical expression would evaluate correctly
 */
export function validateMathExpression(expression: string): boolean {
  return safeMathEvaluate(expression) !== null;
}

/**
 * Safe evaluation with fallback value
 */
export function safeMathEvaluateWithDefault(expression: string, defaultValue: number = 0): number {
  return safeMathEvaluate(expression) ?? defaultValue;
}
