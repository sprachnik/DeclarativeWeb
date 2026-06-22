# Property Names Reference

DeclarativeWeb supports **flexible property names** for common blocks to accommodate different conventions and make the API more forgiving.

## Supported Alternatives

### Hero Block
Use **either** naming convention:

```json
// Preferred
{
  "type": "hero",
  "headline": "Main Title",
  "subhead": "Subtitle text"
}

// Also works
{
  "type": "hero",
  "title": "Main Title",
  "subtitle": "Subtitle text"
}
```

### HTML Block
Use **either** property name:

```json
// Preferred
{
  "type": "html",
  "html": "<div>Your HTML here</div>"
}

// Also works
{
  "type": "html",
  "content": "<div>Your HTML here</div>"
}
```

### Section Block
Use **either** for the description:

```json
// Preferred
{
  "type": "section",
  "title": "Section Title",
  "description": "Optional description text"
}

// Also works
{
  "type": "section",
  "title": "Section Title",
  "subtitle": "Optional description text"
}
```

## Important: Conditional Block Structure

When using `if`/`then`/`else`, blocks go **directly** in the then/else properties:

### ❌ Incorrect - Don't wrap in extra properties
```json
{
  "if": "state.isReady",
  "then": {...},
  "else": {
    "loading": {  // ❌ DON'T DO THIS
      "type": "html",
      "html": "Loading..."
    }
  }
}
```

### ✅ Correct - Block goes directly
```json
{
  "if": "state.isReady",
  "then": {
    "type": "section",
    "title": "Content"
  },
  "else": {  // ✅ Block here directly
    "type": "html",
    "html": "Loading..."
  }
}
```

## Loading States in Lifecycle

For loading states with data fetching, use `loading` at the **root level** alongside `fetch`:

```json
{
  "fetch": {
    "url": "/api/data",
    "saveAs": "myData"
  },
  "loading": {  // ✅ Root level, not inside else
    "type": "html",
    "html": "<p>Loading...</p>"
  },
  "block": {
    "type": "section",
    "title": "{{state.myData.title}}"
  }
}
```

## Shorthand State Access

DeclarativeWeb allows accessing state properties directly without the `state.` prefix:

```json
// Both of these work identically:
{ "headline": "Count: {{state.count}}" }
{ "headline": "Count: {{count}}" }
```

This also works in conditionals:

```json
// Both valid:
{ "if": "state.isLoggedIn && state.hasPermission" }
{ "if": "isLoggedIn && hasPermission" }
```

**Resolution order:**
1. Check for function call (e.g., `year()`)
2. Check explicit paths (`state.X`, `site.X`)
3. Check state properties directly (`X` → `state.X`)

**Note:** `site.` prefix is still required for site config to avoid ambiguity.

## Why Support Multiple Names?

- **Flexibility**: Different developers and LLMs use different conventions
- **Forgiveness**: Reduces errors when learning the API
- **Migration**: Easier to adopt from other frameworks
- **LLM-friendly**: AI models can use intuitive names without strict rules

## Best Practice

While both names work, **use the preferred names** (`headline`/`subhead`, `html`, `description`) for consistency across your codebase. The alternatives exist to make the API more forgiving, not as the primary API.

## Summary Table

| Block Type | Property | Preferred | Alternative |
|------------|----------|-----------|-------------|
| Hero | Main text | `headline` | `title` |
| Hero | Secondary text | `subhead` | `subtitle` |
| HTML | Content | `html` | `content` |
| Section | Description | `description` | `subtitle` |

### State Access

| Syntax | Example | Notes |
|--------|---------|-------|
| Full path | `{{state.count}}` | Explicit, always works |
| Shorthand | `{{count}}` | Resolves to `state.count` |
| Site config | `{{site.title}}` | Prefix required |

---

💡 **Tip**: When in doubt, check the [schema.json](./schema.json) file for the canonical property names.
