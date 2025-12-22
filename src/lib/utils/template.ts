/**
 * Template utilities for processing handlebars-like syntax in text blocks and SQL queries
 */

import type { QueryFilterBinding, Filter } from '../types/index';

export interface TemplateContext {
  variables: Record<string, any>;
  dashboardVariables?: Record<string, any>;
  systemVariables?: Record<string, any>;
}

export interface FilterBindingContext {
  dashboardId: string;
  filters: Filter[];
  filterBindings: QueryFilterBinding[];
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
 * Process SQL query with filter bindings
 * Replaces {{filterKey}} placeholders with either activeValue or inactiveValue
 * based on filter state, and also replaces {{val}} in activeValue with the actual filter value
 */
export function processQueryWithFilters(sql: string, context: FilterBindingContext): string {
  const { dashboardId, filters, filterBindings } = context;

  const relevantBindings = filterBindings.filter((b) => b.dashboardId === dashboardId);

  let processedSql = sql;

  for (const binding of relevantBindings) {
    const filter = filters.find((f) => f.key === binding.filterKey);
    const placeholder = `{{${binding.filterKey}}}`;

    if (!processedSql.includes(placeholder)) {
      continue;
    }

    let replacement: string;

    if (filter && filter.active) {
      const filterValue = filter.currentValue ?? filter.initialValue;
      replacement = binding.activeValue.replace(
        /\{\{val\}\}/g,
        formatFilterValue(filterValue, filter.type)
      );
    } else {
      replacement = binding.inactiveValue;
    }

    processedSql = processedSql.replace(new RegExp(escapeRegExp(placeholder), 'g'), replacement);
  }

  return processedSql;
}

/**
 * Format filter value for SQL based on filter type
 */
function formatFilterValue(value: any, type: string): string {
  if (value === null || value === undefined) {
    return 'NULL';
  }

  switch (type) {
    case 'string':
      return String(value).replace(/'/g, "''");
    case 'integer':
    case 'float':
      return String(value);
    case 'boolean':
      return value ? 'true' : 'false';
    case 'date':
      if (value instanceof Date) {
        return value.toISOString().split('T')[0];
      }
      return String(value);
    case 'date_range':
      if (Array.isArray(value) && value.length === 2) {
        const start =
          value[0] instanceof Date ? value[0].toISOString().split('T')[0] : String(value[0]);
        const end =
          value[1] instanceof Date ? value[1].toISOString().split('T')[0] : String(value[1]);
        return `${start}' AND '${end}`;
      }
      return String(value);
    case 'integer_range':
    case 'float_range':
      if (Array.isArray(value) && value.length === 2) {
        return `${value[0]} AND ${value[1]}`;
      }
      return String(value);
    case 'list':
      if (Array.isArray(value)) {
        return value.map((v) => `'${String(v).replace(/'/g, "''")}'`).join(', ');
      }
      return String(value);
    default:
      return String(value);
  }
}

/**
 * Escape special regex characters in a string
 */
function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
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

  return matches.map((match) => match.replace(/\{\{|\}\}/g, ''));
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
