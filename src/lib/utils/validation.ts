import type { Dashboard, Block, Position, Size, DashboardLayout } from '../types/index.js';

/**
 * Validation utilities for dashboard and block data
 */

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Validate dashboard structure
 */
export function validateDashboard(dashboard: Partial<Dashboard>): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Required fields
  if (!dashboard.name?.trim()) {
    errors.push('Dashboard name is required');
  }

  if (!dashboard.layout) {
    errors.push('Dashboard layout is required');
  } else {
    const layoutValidation = validateLayout(dashboard.layout);
    errors.push(...layoutValidation.errors);
    warnings.push(...layoutValidation.warnings);
  }

  // Validate blocks
  if (dashboard.blocks) {
    dashboard.blocks.forEach((block, index) => {
      const blockValidation = validateBlock(block, dashboard.layout);
      errors.push(...blockValidation.errors.map(err => `Block ${index + 1}: ${err}`));
      warnings.push(...blockValidation.warnings.map(warn => `Block ${index + 1}: ${warn}`));
    });

    // Check for duplicate block IDs
    const blockIds = dashboard.blocks.map(b => b.id);
    const duplicateIds = blockIds.filter((id, index) => blockIds.indexOf(id) !== index);
    if (duplicateIds.length > 0) {
      errors.push(`Duplicate block IDs found: ${duplicateIds.join(', ')}`);
    }

    // Check for overlapping blocks
    const overlaps = findOverlappingBlocks(dashboard.blocks);
    if (overlaps.length > 0) {
      warnings.push(`Overlapping blocks detected: ${overlaps.map(o => `${o[0]} and ${o[1]}`).join(', ')}`);
    }
  }

  return { isValid: errors.length === 0, errors, warnings };
}

/**
 * Validate block structure
 */
export function validateBlock(block: Partial<Block>, layout?: DashboardLayout): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Required fields
  if (!block.id?.trim()) {
    errors.push('Block ID is required');
  }

  if (!block.type) {
    errors.push('Block type is required');
  } else if (!['table', 'graph', 'text'].includes(block.type)) {
    errors.push(`Invalid block type: ${block.type}`);
  }

  if (!block.title?.trim()) {
    warnings.push('Block title is recommended');
  }

  // Position validation
  if (block.position) {
    const positionValidation = validatePosition(block.position, layout);
    errors.push(...positionValidation.errors);
    warnings.push(...positionValidation.warnings);
  } else {
    errors.push('Block position is required');
  }

  // Size validation
  if (block.size) {
    const sizeValidation = validateSize(block.size, layout);
    errors.push(...sizeValidation.errors);
    warnings.push(...sizeValidation.warnings);
  } else {
    errors.push('Block size is required');
  }

  return { isValid: errors.length === 0, errors, warnings };
}

/**
 * Validate dashboard layout
 */
export function validateLayout(layout: Partial<DashboardLayout>): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!layout.gridSize || layout.gridSize <= 0) {
    errors.push('Grid size must be a positive number');
  }

  if (!layout.columns || layout.columns <= 0) {
    errors.push('Columns must be a positive number');
  }

  if (!layout.rows || layout.rows <= 0) {
    errors.push('Rows must be a positive number');
  }

  if (layout.gap !== undefined && layout.gap < 0) {
    errors.push('Gap cannot be negative');
  }

  // Reasonable limits
  if (layout.columns && layout.columns > 24) {
    warnings.push('Consider reducing column count for better usability');
  }

  if (layout.rows && layout.rows > 20) {
    warnings.push('Consider reducing row count for better performance');
  }

  return { isValid: errors.length === 0, errors, warnings };
}

/**
 * Validate block position
 */
export function validatePosition(position: Partial<Position>, layout?: DashboardLayout): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (position.x === undefined || position.x < 0) {
    errors.push('Position X must be non-negative');
  }

  if (position.y === undefined || position.y < 0) {
    errors.push('Position Y must be non-negative');
  }

  if (layout) {
    if (position.x !== undefined && position.x >= layout.columns) {
      errors.push(`Position X (${position.x}) exceeds layout columns (${layout.columns})`);
    }

    if (position.y !== undefined && position.y >= layout.rows) {
      warnings.push(`Position Y (${position.y}) exceeds layout rows (${layout.rows})`);
    }
  }

  return { isValid: errors.length === 0, errors, warnings };
}

/**
 * Validate block size
 */
export function validateSize(size: Partial<Size>, layout?: DashboardLayout): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!size.width || size.width <= 0) {
    errors.push('Size width must be positive');
  }

  if (!size.height || size.height <= 0) {
    errors.push('Size height must be positive');
  }

  if (layout) {
    if (size.width && size.width > layout.columns) {
      warnings.push(`Block width (${size.width}) exceeds layout columns (${layout.columns})`);
    }

    if (size.height && size.height > layout.rows) {
      warnings.push(`Block height (${size.height}) exceeds layout rows (${layout.rows})`);
    }
  }

  // Minimum size recommendations
  if (size.width && size.width < 2) {
    warnings.push('Consider increasing block width for better content display');
  }

  if (size.height && size.height < 2) {
    warnings.push('Consider increasing block height for better content display');
  }

  return { isValid: errors.length === 0, errors, warnings };
}

/**
 * Find overlapping blocks
 */
export function findOverlappingBlocks(blocks: Block[]): [string, string][] {
  const overlaps: [string, string][] = [];

  for (let i = 0; i < blocks.length; i++) {
    for (let j = i + 1; j < blocks.length; j++) {
      const block1 = blocks[i];
      const block2 = blocks[j];

      if (blocksOverlap(block1, block2)) {
        overlaps.push([block1.id, block2.id]);
      }
    }
  }

  return overlaps;
}

/**
 * Check if two blocks overlap
 */
export function blocksOverlap(block1: Block, block2: Block): boolean {
  const x1End = block1.position.x + block1.size.width;
  const y1End = block1.position.y + block1.size.height;
  const x2End = block2.position.x + block2.size.width;
  const y2End = block2.position.y + block2.size.height;

  return !(
    block1.position.x >= x2End ||
    block2.position.x >= x1End ||
    block1.position.y >= y2End ||
    block2.position.y >= y1End
  );
}

/**
 * Check if block fits within layout bounds
 */
export function blockFitsInLayout(block: Block, layout: DashboardLayout): boolean {
  const blockEndX = block.position.x + block.size.width;
  const blockEndY = block.position.y + block.size.height;

  return blockEndX <= layout.columns && blockEndY <= layout.rows;
}

/**
 * Generate unique block ID
 */
export function generateBlockId(): string {
  return `block-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
}

/**
 * Generate unique dashboard ID
 */
export function generateDashboardId(): string {
  return `dashboard-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
}
