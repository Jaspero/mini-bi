# SQL Editor Features

The SQLEditor component provides a powerful Monaco-based SQL editing experience with the following features:

## Core Features

### 1. Monaco Editor Integration
- **Syntax highlighting** for SQL
- **Error detection** and validation
- **Multi-cursor editing** support
- **Find and replace** functionality
- **Automatic indentation** and formatting

### 2. IntelliSense Autocomplete
- **SQL Keywords**: Comprehensive list of SQL commands, functions, and operators
- **Table Names**: All available tables in the schema
- **Column Names**: Table-qualified column references (e.g., `users.email`)
- **Smart Suggestions**: Context-aware autocomplete based on cursor position

### 3. Schema Viewer
- **Collapsible panel** with database schema information
- **Table browser** with clickable table names
- **Column details** showing data types, constraints, and flags
- **Quick actions**:
  - Insert table name (+)
  - Generate SELECT * query (★)
  - Insert column references

### 4. SQL Templates
- **Pre-built templates** for common SQL patterns:
  - Basic SELECT queries
  - JOIN operations
  - GROUP BY aggregations
  - INSERT statements
  - UPDATE statements
- **One-click insertion** of template code

### 5. Keyboard Shortcuts
- **Ctrl/Cmd + Enter**: Execute query (fires `execute` event)
- **Ctrl/Cmd + S**: Save query (fires `save` event)
- **Shift + Alt + F**: Format SQL code
- **Ctrl/Cmd + F**: Find text
- **Ctrl/Cmd + H**: Find and replace

### 6. Additional Features
- **Format SQL**: Automatic code formatting
- **Resizable editor**: Vertical resize with min/max constraints
- **Responsive design**: Adapts to different screen sizes
- **Accessibility**: Proper ARIA labels and keyboard navigation

## Usage

```svelte
<script>
  import SQLEditor from './SQLEditor.svelte';
  
  let sqlValue = 'SELECT * FROM users;';
  
  function handleExecute(event) {
    console.log('Execute SQL:', event.detail.value);
  }
  
  function handleSave(event) {
    console.log('Save SQL:', event.detail.value);
  }
</script>

<SQLEditor 
  bind:value={sqlValue}
  on:change={(e) => console.log('SQL changed:', e.detail.value)}
  on:execute={handleExecute}
  on:save={handleSave}
/>
```

## Events

- `change`: Fired when the SQL content changes
- `execute`: Fired when Ctrl/Cmd+Enter is pressed
- `save`: Fired when Ctrl/Cmd+S is pressed

## Props

- `value`: The SQL string (two-way binding)
- `disabled`: Boolean to disable the editor

## Customization

The editor can be customized by:
1. Modifying the `mockSchema` object to reflect your actual database schema
2. Adding custom SQL templates in the `sqlTemplates` array
3. Extending the autocomplete suggestions
4. Customizing the CSS styles

## Future Enhancements

- Connect to real database schema API
- Add syntax error highlighting
- Implement query execution history
- Add dark mode support
- Include more SQL dialects
- Add query performance hints
