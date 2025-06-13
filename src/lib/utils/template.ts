/**
 * Template utilities for processing handlebars-like syntax in text blocks
 */

export interface TemplateContext {
  variables: Record<string, any>;
  dashboardVariables?: Record<string, any>;
  systemVariables?: Record<string, any>;
}

/**
 * Process template string with variables using {{variable}} syntax
 */
export function processTemplate(template: string, context: TemplateContext): string {
  const allVariables = {
    ...getSystemVariables(),
    ...context.dashboardVariables,
    ...context.variables
  };

  return template.replace(/\{\{(\w+)\}\}/g, (match, variableName) => {
    const value = allVariables[variableName];
    return value !== undefined ? String(value) : match;
  });
}

/**
 * Get system variables like current date/time
 */
export function getSystemVariables(): Record<string, string> {
  const now = new Date();
  
  return {
    currentDate: now.toLocaleDateString(),
    currentTime: now.toLocaleTimeString(),
    currentDateTime: now.toLocaleString(),
    timestamp: now.getTime().toString(),
    year: now.getFullYear().toString(),
    month: (now.getMonth() + 1).toString().padStart(2, '0'),
    day: now.getDate().toString().padStart(2, '0')
  };
}

/**
 * Extract variable names from template string
 */
export function extractVariables(template: string): string[] {
  const matches = template.match(/\{\{(\w+)\}\}/g);
  if (!matches) return [];
  
  return matches.map(match => match.replace(/\{\{|\}\}/g, ''));
}

/**
 * Validate template syntax
 */
export function validateTemplate(template: string): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  // Check for unmatched braces
  const openBraces = (template.match(/\{\{/g) || []).length;
  const closeBraces = (template.match(/\}\}/g) || []).length;
  
  if (openBraces !== closeBraces) {
    errors.push('Unmatched template braces detected');
  }
  
  // Check for invalid variable names (should only contain word characters)
  const invalidVariables = template.match(/\{\{[^}]*[^\w}][^}]*\}\}/g);
  if (invalidVariables) {
    errors.push(`Invalid variable names: ${invalidVariables.join(', ')}`);
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Sanitize HTML content to prevent XSS
 */
export function sanitizeHtml(html: string): string {
  // Basic HTML sanitization - in production, consider using a library like DOMPurify
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '');
}
