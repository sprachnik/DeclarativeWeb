# JSON Component Injection System - Implementation Plan

## Overview

Add a complementary paradigm to DeclarativeWeb where components can be injected anywhere on a page using JSON, without requiring the routing system. Primary use case: **LLM-generated components streamed in real-time**.

### Key Requirements

1. **Streaming JSON support** - Parse incomplete/broken JSON as it arrives from LLM
2. **Stateful components** - Injected components participate in state management
3. **JSON-first** - Maintain "edit JSON only" philosophy
4. **Routing-independent** - Works standalone or alongside existing routing

---

## Architecture Design

### 1. Streaming JSON Parser

**Purpose**: Parse incomplete JSON chunks in real-time as LLM streams output.

**Approach**: Incremental JSON parsing with graceful degradation

```javascript
class StreamingJSONParser {
  constructor(onUpdate) {
    this.buffer = ''
    this.lastValidJSON = null
    this.onUpdate = onUpdate // Callback when new valid JSON parsed
  }

  append(chunk) {
    this.buffer += chunk
    const parsed = this.tryParse()
    if (parsed !== null) {
      this.lastValidJSON = parsed
      this.onUpdate(parsed)
    }
  }

  tryParse() {
    // Strategy 1: Try complete JSON first
    try {
      return JSON.parse(this.buffer)
    } catch (e) {
      // Strategy 2: Try with auto-closing
      return this.parsePartial()
    }
  }

  parsePartial() {
    // Close unclosed strings, objects, arrays
    // Example: '{"title": "Hello' → '{"title": "Hello"}'
    // Example: '{"items": [{"name"' → '{"items": [{"name": ""}]}'
  }
}
```

**Partial Parsing Strategies**:

1. **String completion**: Close unclosed quotes
2. **Object completion**: Close unclosed braces
3. **Array completion**: Close unclosed brackets
4. **Property completion**: Add empty values to incomplete properties
5. **Progressive rendering**: Render what's valid, show placeholders for incomplete

**Visual Feedback During Streaming**:
- Completed fields: Render fully
- Incomplete fields: Show loading skeleton or "..." indicator
- Invalid fields: Show placeholder, attempt to recover

---

### 2. Injection API

**Core API**: Programmatic and declarative approaches

#### 2.1 Programmatic API

```javascript
// Basic injection
Render.inject(selector, block, options)

// Examples:
Render.inject('#hero-slot', {
  type: 'hero',
  title: 'Welcome',
  subtitle: 'Get started today'
})

Render.inject('.sidebar', {
  $ref: 'card',
  title: 'Quick Links',
  items: [...]
})

// Streaming injection (for LLM use)
const stream = Render.createStream('#output')
stream.append('{"type": "hero", "title": "')
stream.append('Hello World')
stream.append('", "subtitle": "')
stream.append('This is streaming!"')
stream.append('}')
stream.complete() // Finalize and render fully
```

#### 2.2 Declarative JSON API

Add to `site.json`:

```json
{
  "site": { ... },
  "components": { ... },
  "injections": [
    {
      "id": "sidebar-widget",
      "target": "#sidebar",
      "block": {
        "$ref": "widget",
        "title": "Latest Updates"
      }
    },
    {
      "id": "dynamic-hero",
      "target": "#hero-slot",
      "block": {
        "type": "hero",
        "title": "{{state.userName}}'s Dashboard",
        "subtitle": "Welcome back!"
      },
      "if": "state.isLoggedIn"
    }
  ],
  "pages": [ ... ]
}
```

Call `Render.processInjections()` after init to populate.

#### 2.3 HTML Attributes (Future Enhancement)

```html
<div data-render-inject='{"$ref": "card", "title": "My Card"}'></div>
```

---

### 3. Injection Registry & State Management

**Registry Structure**:

```javascript
const injectionRegistry = new Map([
  [injectId, {
    selector: '#hero-slot',
    block: { type: 'hero', ... },
    element: DOMElement,
    isStreaming: false,
    parser: StreamingJSONParser | null
  }]
])
```

**State Integration**:

Injected components automatically:
1. Access `state` via `{{state.prop}}` interpolation
2. Re-render when state changes (via StateManager listener)
3. Participate in reactive updates like page content

**Implementation**:

```javascript
// Hook into StateManager
const stateManager = new StateManager(initialState)
stateManager.addListener((changedPaths, newState) => {
  // Re-render affected injections
  injectionRegistry.forEach((injection, id) => {
    if (injectionUsesState(injection.block, changedPaths)) {
      reRenderInjection(id)
    }
  })
})
```

---

### 4. JSON Schema Extension

Add to `schema.json`:

```json
{
  "properties": {
    "injections": {
      "type": "array",
      "description": "Component injections for non-routed content",
      "items": {
        "type": "object",
        "required": ["target", "block"],
        "properties": {
          "id": {
            "type": "string",
            "description": "Unique identifier for this injection"
          },
          "target": {
            "type": "string",
            "description": "CSS selector for injection target"
          },
          "block": {
            "description": "Block definition (same as page content blocks)",
            "oneOf": [
              { "$ref": "#/definitions/heroBlock" },
              { "$ref": "#/definitions/sectionBlock" },
              { "$ref": "#/definitions/componentReference" },
              { "$ref": "#/definitions/htmlBlock" },
              { "$ref": "#/definitions/markdownBlock" }
            ]
          },
          "if": {
            "type": "string",
            "description": "Conditional expression (renders only if true)"
          },
          "mode": {
            "type": "string",
            "enum": ["replace", "append", "prepend"],
            "default": "replace",
            "description": "How to inject into target element"
          }
        }
      }
    }
  }
}
```

---

## Implementation Plan

### Phase 1: Core Injection System

**Files to modify**: `render.js`

**New functions**:

1. ✅ `Render.inject(selector, block, options = {})`
   - Validates selector exists
   - Renders block using existing `renderBlock()`
   - Inserts into DOM (replace/append/prepend)
   - Registers in injection registry
   - Returns injection ID

2. ✅ `Render.destroyInjection(id)`
   - Removes from DOM
   - Unregisters from registry
   - Cleans up listeners

3. ✅ `Render.updateInjection(id, newBlock)`
   - Updates registry
   - Re-renders block
   - Maintains same DOM position

4. ✅ `Render.processInjections()`
   - Reads `data.injections` array
   - Processes each injection
   - Evaluates conditionals (`if` property)

**State integration**:

- Add listener to StateManager (if v2 enabled) or simple proxy (v1)
- Track which injections use state variables
- Re-render on relevant state changes

**Testing**:
- Manual injection via browser console
- State changes triggering re-renders
- Multiple injections in same container

---

### Phase 2: Streaming JSON Parser

**New file**: `streaming-json-parser.js`

**Core functionality**:

1. ✅ `StreamingJSONParser` class
   - Buffer management
   - Incremental parsing
   - Partial JSON completion strategies
   - Error recovery

2. ✅ Partial parsing algorithms:
   - String completion: `"title": "Hello` → `"title": "Hello"`
   - Object completion: `{"title": "Hello"` → `{"title": "Hello"}`
   - Array completion: `{"items": [{"name"` → `{"items": [{"name": ""}]}`
   - Nested structure handling

3. ✅ Visual feedback:
   - Completed sections: Render fully
   - Incomplete sections: Show skeleton/placeholder
   - Use CSS classes: `.streaming-incomplete`, `.streaming-complete`

**Testing**:
- Feed JSON char-by-char
- Test with nested objects
- Test with arrays
- Test with escaped strings
- Verify graceful degradation

---

### Phase 3: Streaming Injection API

**New functions in `render.js`**:

1. ✅ `Render.createStream(selector, options = {})`
   - Creates StreamingJSONParser instance
   - Returns stream object with methods:
     - `append(chunk)` - Add JSON chunk
     - `complete()` - Finalize parsing
     - `cancel()` - Abort streaming
   - Registers as streaming injection

2. ✅ Stream object API:
   ```javascript
   const stream = Render.createStream('#output', {
     placeholderClass: 'streaming',
     onProgress: (partial) => { },
     onComplete: (final) => { },
     onError: (error) => { }
   })

   stream.append('{"type": "hero"')
   stream.append(', "title": "Hello"')
   stream.append('}')
   stream.complete()
   ```

3. ✅ Progressive rendering:
   - Each valid chunk triggers partial render
   - Update same DOM location
   - Smooth transitions (CSS animations)

**Testing**:
- Simulate LLM streaming (setInterval with JSON chunks)
- Test error recovery
- Test concurrent streams
- Performance with large JSON

---

### Phase 4: JSON Manifest Support

**Schema update**: Add `injections` array to `schema.json`

**Functionality**:

1. ✅ Parse `data.injections` in `Render.init()`
2. ✅ Process conditionals (evaluate `if` expressions)
3. ✅ Support `mode`: replace, append, prepend
4. ✅ Auto-process on init or call `Render.processInjections()`

**Example usage**:

```json
{
  "site": {
    "title": "My App",
    "state": {
      "isLoggedIn": false,
      "userName": "Guest"
    }
  },
  "injections": [
    {
      "id": "welcome-banner",
      "target": "#top-banner",
      "block": {
        "type": "hero",
        "title": "Welcome, {{state.userName}}!",
        "subtitle": "You have 3 new messages"
      },
      "if": "state.isLoggedIn"
    },
    {
      "id": "login-prompt",
      "target": "#top-banner",
      "block": {
        "type": "html",
        "content": "<p>Please <a href='/login'>log in</a> to continue.</p>"
      },
      "if": "!state.isLoggedIn"
    }
  ],
  "pages": [...]
}
```

---

### Phase 5: Documentation & Examples

**New files**:

1. ✅ `INJECTION.md` - Complete injection API reference
2. ✅ `examples/injection-demo.html` - Live demo
3. ✅ `examples/streaming-demo.html` - LLM streaming simulation
4. ✅ Update `README.md` - Add injection section

**Documentation sections**:

- Quick start guide
- API reference (all methods)
- Streaming JSON guide
- State management integration
- Error handling
- Best practices
- FAQ

**Examples**:

- Basic injection
- Streaming from LLM
- Conditional injections
- State-driven components
- Multiple injections
- Cleanup and lifecycle

---

### Phase 6: Auto-Fetch & Lifecycle Hooks

**Purpose**: Enable injections to fetch data automatically and execute actions on mount/unmount.

**New features**:

1. ✅ **onMount actions** - Execute actions when injection renders
   - Fetch data from APIs
   - Initialize component state
   - Track analytics events

2. ✅ **onUnmount actions** - Cleanup when injection destroyed
   - Clear timers/intervals
   - Cancel pending requests
   - Save state

3. ✅ **Auto-fetch** - Declarative data loading
   - Fetch on injection mount
   - Loading state while fetching
   - Error state on failure

4. ✅ **Loading states** - Show skeleton/spinner during async operations

5. ✅ **Error states** - Graceful error handling with retry

**Implementation**:

**A. Add lifecycle support to injection registry**:

```javascript
const injectionRegistry = new Map([
  [injectId, {
    selector: '#hero-slot',
    block: { type: 'hero', ... },
    element: DOMElement,
    isStreaming: false,
    parser: StreamingJSONParser | null,
    lifecycle: {
      onMount: [...actions],
      onUnmount: [...actions],
      mounted: false
    },
    fetchConfig: { url: '...', saveAs: '...' },
    loadingBlock: { type: 'html', ... },
    errorBlock: { type: 'html', ... }
  }]
])
```

**B. Execute lifecycle hooks**:

```javascript
async function executeInjection(config) {
  const { target, block, onMount, onUnmount, fetch, loading, error } = config

  // 1. Show loading state if fetching
  if (fetch && loading) {
    renderToTarget(target, loading)
  }

  // 2. Execute onMount actions (including fetch)
  if (onMount) {
    try {
      await actionExecutor.execute(onMount)
    } catch (err) {
      if (error) {
        renderToTarget(target, error)
        return
      }
    }
  }

  // 3. Render main block
  renderToTarget(target, block)

  // 4. Store cleanup handler
  registry.get(id).lifecycle.onUnmount = onUnmount
}
```

**C. JSON schema for lifecycle**:

```json
{
  "injections": [
    {
      "target": "#widget",
      "onMount": [
        {
          "type": "fetch",
          "url": "https://api.example.com/data",
          "saveAs": "widgetData"
        },
        {
          "type": "setState",
          "updates": { "widgetLoaded": true }
        }
      ],
      "onUnmount": [
        {
          "type": "setState",
          "updates": { "widgetLoaded": false }
        }
      ],
      "loading": {
        "type": "html",
        "content": "<div class='skeleton'>⏳ Loading...</div>"
      },
      "error": {
        "type": "html",
        "content": "<div class='error'>❌ Failed to load data</div>"
      },
      "block": {
        "type": "html",
        "content": "<p>{{state.widgetData.message}}</p>"
      }
    }
  ]
}
```

**D. Simplified fetch syntax** (sugar for onMount fetch):

```json
{
  "injections": [
    {
      "target": "#dashboard",
      "fetch": {
        "url": "/api/dashboard",
        "saveAs": "dashboardData"
      },
      "loading": {
        "type": "html",
        "content": "<div class='loading-spinner'></div>"
      },
      "block": {
        "type": "section",
        "title": "{{state.dashboardData.title}}",
        "cards": "{{state.dashboardData.cards}}"
      }
    }
  ]
}
```

This is syntactic sugar that expands to:

```json
{
  "onMount": [{
    "type": "fetch",
    "url": "/api/dashboard",
    "saveAs": "dashboardData"
  }],
  "block": { ... }
}
```

**E. Complex example - Multi-fetch dashboard**:

```json
{
  "injections": [
    {
      "target": "#user-dashboard",
      "onMount": [
        {
          "type": "fetch",
          "url": "https://api.example.com/user/profile",
          "saveAs": "userProfile"
        },
        {
          "type": "fetch",
          "url": "https://api.example.com/user/stats",
          "saveAs": "userStats"
        },
        {
          "type": "fetch",
          "url": "https://api.example.com/user/orders",
          "method": "GET",
          "params": { "limit": 10 },
          "saveAs": "recentOrders"
        },
        {
          "type": "setState",
          "updates": { "dashboardReady": true }
        }
      ],
      "loading": {
        "type": "html",
        "content": `
          <div class="dashboard-loading">
            <div class="skeleton-header"></div>
            <div class="skeleton-grid">
              <div class="skeleton-card"></div>
              <div class="skeleton-card"></div>
              <div class="skeleton-card"></div>
            </div>
          </div>
        `
      },
      "error": {
        "type": "html",
        "content": `
          <div class="error-state">
            <h3>Failed to load dashboard</h3>
            <button onclick="location.reload()">Retry</button>
          </div>
        `
      },
      "block": {
        "type": "section",
        "title": "Welcome, {{state.userProfile.name}}",
        "cards": [
          {
            "$ref": "stats-card",
            "stats": "{{state.userStats}}"
          },
          {
            "type": "html",
            "content": "<h4>Recent Orders</h4>"
          },
          {
            "each": "state.recentOrders",
            "as": "order",
            "content": {
              "$ref": "order-card",
              "orderId": "{{order.id}}",
              "status": "{{order.status}}",
              "total": "{{order.total}}",
              "date": "{{order.createdAt}}"
            }
          }
        ]
      }
    }
  ]
}
```

**F. Programmatic API**:

```javascript
// With lifecycle hooks
const id = Render.inject('#widget', {
  type: 'html',
  content: '<p>{{state.data}}</p>'
}, {
  onMount: [
    { type: 'fetch', url: '/api/data', saveAs: 'data' }
  ],
  onUnmount: [
    { type: 'setState', updates: { data: null } }
  ],
  loading: {
    type: 'html',
    content: '<div>Loading...</div>'
  }
})

// Cleanup (triggers onUnmount)
Render.destroyInjection(id)
```

**G. Stream with auto-fetch**:

```javascript
// LLM generates injection config with fetch
const stream = Render.createStream('#output')

stream.append('{"onMount": [')
stream.append('  {"type": "fetch", "url": "/api/users", "saveAs": "users"}')
stream.append('],')
stream.append('"loading": {"type": "html", "content": "Loading..."},')
stream.append('"block": {')
stream.append('  "each": "state.users",')
stream.append('  "as": "user",')
stream.append('  "content": {"$ref": "user-card", "name": "{{user.name}}"}')
stream.append('}}')

stream.complete()
```

**Testing**:
- onMount actions execute before rendering
- onUnmount actions execute on destroy
- Loading state shows during fetch
- Error state shows on fetch failure
- Multiple fetches execute in parallel
- Fetch results stored in state before render

**Files to modify**:
1. `/render.js` - Add lifecycle execution
2. `/schema.json` - Add onMount, onUnmount, loading, error properties
3. `/INJECTION.md` - Document lifecycle hooks

**Timeline**: 4-6 hours
- Lifecycle hook execution: 2h
- Loading/error states: 2h
- Testing: 2h

---

## Technical Considerations

### 1. Streaming JSON Parser Challenges

**Problem**: JSON is not streamable by design (requires closing braces)

**Solutions**:

1. **Auto-completion heuristics**:
   - Track opening/closing brackets
   - Infer structure from context
   - Add closing syntax when missing

2. **Fallback strategies**:
   - If complete parse fails, try partial
   - If partial fails, render previous valid state
   - Never crash - always show something

3. **Visual feedback**:
   ```css
   .streaming-incomplete::after {
     content: '...';
     animation: pulse 1s infinite;
   }
   ```

### 2. State Management Integration

**Challenge**: Avoid infinite render loops

**Solution**: Use existing StateManager infinite loop protection

```javascript
// StateManager already has:
- renderCount tracking
- maxRenders limit (100)
- warningThreshold (10)
- Circular dependency detection
```

**Injection-specific**:
- Track which state paths each injection uses
- Only re-render if relevant paths change
- Batch updates (debounce re-renders)

### 3. Performance Considerations

**Multiple injections**:
- Registry lookup: O(1) via Map
- State change detection: Only check affected injections
- DOM updates: Batch with requestAnimationFrame

**Streaming**:
- Throttle updates (max 60fps)
- Use DocumentFragment for complex blocks
- CSS containment for layout optimization

### 4. Error Handling

**Invalid selectors**:
```javascript
if (!document.querySelector(selector)) {
  console.error(`Injection target not found: ${selector}`)
  return null
}
```

**Invalid blocks**:
```javascript
try {
  const html = renderBlock(block)
} catch (e) {
  return renderError('injection', e, block)
}
```

**Streaming errors**:
- Invalid JSON: Show last valid state + error indicator
- Timeout: Complete stream after N seconds
- Network errors: Allow retry

---

## API Summary

### Core API

```javascript
// Initialize with injections in JSON
Render.init({
  src: 'site.json',  // Contains "injections": [...]
  target: '#app'
})

// Programmatic injection
const id = Render.inject('#target', {
  type: 'hero',
  title: 'Hello World'
})

// Update existing injection
Render.updateInjection(id, {
  type: 'hero',
  title: 'Updated Title'
})

// Remove injection
Render.destroyInjection(id)

// Process all JSON injections
Render.processInjections()

// Streaming API
const stream = Render.createStream('#output', {
  onProgress: (partial) => console.log('Partial:', partial),
  onComplete: (final) => console.log('Done:', final),
  onError: (err) => console.error('Error:', err)
})

stream.append('{"type": "hero", ')
stream.append('"title": "Streaming Title"')
stream.append('}')
stream.complete()

// Or use streaming injection directly
Render.injectStream('#target', llmStreamSource)
```

### Options

```javascript
{
  mode: 'replace' | 'append' | 'prepend',  // Default: 'replace'
  reactive: true,                          // Re-render on state changes
  placeholderClass: 'streaming',           // CSS class for incomplete
  throttle: 16,                            // ms between stream updates
  timeout: 30000                           // ms before stream auto-completes
}
```

---

## Use Cases

### 1. LLM Component Generation

```javascript
// Connect to LLM API
const response = await fetch('/api/generate-component', {
  method: 'POST',
  body: JSON.stringify({ prompt: 'Create a pricing table' })
})

const reader = response.body.getReader()
const stream = Render.createStream('#output')

while (true) {
  const { done, value } = await reader.read()
  if (done) break

  const chunk = new TextDecoder().decode(value)
  stream.append(chunk)
}

stream.complete()
```

### 2. Dynamic Dashboards

```json
{
  "site": {
    "state": {
      "widgets": ["sales", "traffic", "users"]
    }
  },
  "components": {
    "widget": "<div class='widget'>{{title}}: {{value}}</div>"
  },
  "injections": [
    {
      "target": "#dashboard-grid",
      "block": {
        "each": "state.widgets",
        "as": "widget",
        "content": {
          "$ref": "widget",
          "title": "{{widget}}"
        }
      }
    }
  ]
}
```

### 3. Conditional Banners

```json
{
  "injections": [
    {
      "target": "#banner",
      "if": "state.hasNewFeature",
      "block": {
        "type": "hero",
        "title": "New Feature Available!",
        "cta": {
          "text": "Learn More",
          "action": { "type": "navigate", "path": "/features" }
        }
      }
    }
  ]
}
```

---

## Testing Strategy

### Unit Tests

1. **StreamingJSONParser**:
   - Complete JSON parsing
   - Partial JSON completion
   - Nested structures
   - Arrays and objects
   - Error recovery

2. **Injection API**:
   - Basic injection
   - Multiple injections
   - Update/destroy
   - Invalid selectors
   - Invalid blocks

3. **State Integration**:
   - State changes trigger re-renders
   - Only affected injections update
   - No infinite loops

### Integration Tests

1. **Full streaming flow**:
   - Simulate LLM streaming
   - Verify progressive rendering
   - Check final output

2. **JSON manifest**:
   - Load injections from JSON
   - Evaluate conditionals
   - Process on init

### Manual Testing

1. Browser console testing
2. Live LLM streaming demo
3. Performance profiling
4. Memory leak detection

---

## Migration Path

### Backward Compatibility

✅ **Zero breaking changes** - All existing features work unchanged

- Current routing system: Unchanged
- Existing `site.json` files: Work as-is
- New `injections` property: Optional

### Adoption Path

**Stage 1**: Add injection API, no JSON changes needed
```javascript
// Works immediately
Render.inject('#custom', { type: 'hero', title: 'Hello' })
```

**Stage 2**: Add `injections` to JSON
```json
{
  "injections": [...],
  "pages": [...]  // Still works
}
```

**Stage 3**: Use streaming for LLM integration
```javascript
const stream = Render.createStream('#llm-output')
// Integrate with LLM API
```

---

## File Changes Summary

### New Files

1. `/streaming-json-parser.js` - Streaming parser class
2. `/INJECTION.md` - Documentation
3. `/examples/injection-demo.html` - Basic demo
4. `/examples/streaming-demo.html` - Streaming demo

### Modified Files

1. `/render.js`:
   - Add injection registry
   - Add `inject()`, `destroyInjection()`, `updateInjection()`
   - Add `createStream()`, `injectStream()`
   - Add `processInjections()`
   - Integrate with StateManager for re-renders

2. `/schema.json`:
   - Add `injections` array definition
   - Add injection object schema

3. `/README.md`:
   - Add "Component Injection" section
   - Add streaming examples
   - Update feature list

4. `/index.html` (for testing):
   - Add demo injection targets
   - Add streaming demo button

---

## Success Criteria

✅ **Functionality**:
- [ ] Basic injection works programmatically
- [ ] Streaming JSON parser handles incomplete JSON gracefully
- [ ] Injected components react to state changes
- [ ] JSON manifest injections process on init
- [ ] Conditionals work (`if` property)
- [ ] Multiple injection modes (replace/append/prepend)

✅ **Performance**:
- [ ] Streaming updates at 60fps
- [ ] No memory leaks with 100+ injections
- [ ] State changes only re-render affected injections

✅ **Developer Experience**:
- [ ] Clear error messages for invalid injections
- [ ] Complete API documentation
- [ ] Working examples for all use cases
- [ ] JSON schema validation in IDEs

✅ **LLM Integration**:
- [ ] Smooth progressive rendering during streaming
- [ ] Visual feedback for incomplete JSON
- [ ] Error recovery from malformed JSON
- [ ] Clean final output when streaming completes

---

## Timeline Estimate

**Phase 1** (Core Injection): 4-6 hours
- Basic API implementation
- Registry system
- State integration
- Testing

**Phase 2** (Streaming Parser): 6-8 hours
- Parser implementation
- Partial completion strategies
- Error handling
- Testing edge cases

**Phase 3** (Streaming API): 3-4 hours
- Stream object implementation
- Progressive rendering
- Integration with parser

**Phase 4** (JSON Manifest): 2-3 hours
- Schema updates
- Processing logic
- Conditional evaluation

**Phase 5** (Documentation): 3-4 hours
- API docs
- Examples
- Demos

**Phase 6** (Auto-Fetch & Lifecycle): 4-6 hours
- Lifecycle hook execution
- Loading/error states
- Auto-fetch integration
- Testing

**Total**: ~24-31 hours of focused development

---

## Next Steps

1. ✅ Review this plan
2. Get feedback on:
   - Streaming JSON approach
   - API design
   - Use case coverage
3. Prioritize phases (all? subset?)
4. Begin implementation

---

## Questions for Review

1. **Streaming approach**: Is the incremental JSON completion strategy sound? Any edge cases we're missing?

2. **State integration**: Should injections always re-render on state changes, or opt-in via flag?

3. **API surface**: Is the API too large? Should we start with just programmatic injection and add declarative later?

4. **Performance**: Any concerns with 100+ injections on a page?

5. **Naming**: Are `inject`, `createStream`, `processInjections` clear names?

6. **Use cases**: Are we covering the primary use case (LLM streaming) well enough?

Let me know your thoughts and I'll start implementation! 🚀
