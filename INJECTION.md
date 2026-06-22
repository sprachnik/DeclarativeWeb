# Component Injection API

Inject DeclarativeWeb components anywhere on your page without routing. Perfect for dynamic dashboards, LLM-generated components, widgets, and conditional content.

## Table of Contents

- [Quick Start](#quick-start)
- [Core Concepts](#core-concepts)
- [Programmatic API](#programmatic-api)
- [JSON Manifest](#json-manifest)
- [Streaming API](#streaming-api)
- [Lifecycle Hooks](#lifecycle-hooks)
- [State Management](#state-management)
- [Examples](#examples)
- [API Reference](#api-reference)

---

## Quick Start

### 1. Basic Injection

```javascript
// Inject a hero block into #banner element
Render.inject('#banner', {
  type: 'hero',
  title: 'Welcome!',
  subtitle: 'Get started with DeclarativeWeb'
})
```

### 2. With Data Fetching

```javascript
// Inject a widget that fetches data on mount
Render.inject('#sidebar', {
  type: 'html',
  content: '<p>Users: {{state.users.length}}</p>'
}, {
  fetch: {
    url: 'https://api.example.com/users',
    saveAs: 'users'
  },
  loading: {
    type: 'html',
    content: '<p>Loading...</p>'
  }
})
```

### 3. Streaming from LLM

```javascript
// Stream JSON from LLM and render progressively
const stream = Render.createStream('#output')

// As LLM generates JSON chunk by chunk:
stream.append('{"type": "hero", ')
stream.append('"title": "AI Generated", ')
stream.append('"subtitle": "Created in real-time!"}')
stream.complete()
```

---

## Core Concepts

### Injection vs. Routing

**Routing** (traditional DeclarativeWeb):
- Tied to URL paths
- Whole-page rendering
- Defined in `pages` array

**Injection** (new paradigm):
- Independent of routing
- Target any DOM element
- Defined in `injections` array or programmatically
- Can coexist with routed pages

### Use Cases

1. **LLM-Generated Components** - Stream JSON from AI, render in real-time
2. **Dynamic Dashboards** - Inject widgets based on user state
3. **Conditional Banners** - Show/hide content based on conditions
4. **Data-Driven Widgets** - Auto-fetch and display API data
5. **Embedded Components** - Use DeclarativeWeb components in non-DeclarativeWeb pages

---

## Programmatic API

### `Render.inject(selector, block, options)`

Inject a block into a DOM element.

**Parameters:**
- `selector` (string) - CSS selector for target element
- `block` (object) - Block definition (same format as page content)
- `options` (object) - Optional configuration

**Options:**
```javascript
{
  mode: 'replace' | 'append' | 'prepend',  // Default: 'replace'
  reactive: true,                          // Re-render on state changes
  onMount: [...actions],                   // Execute on injection
  onUnmount: [...actions],                 // Execute on removal
  fetch: { url, saveAs, ... },            // Auto-fetch data
  loading: {...block},                     // Show while fetching
  error: {...block}                        // Show on fetch error
}
```

**Returns:** Injection ID (string)

**Example:**
```javascript
const id = Render.inject('#widget', {
  type: 'html',
  content: '<h3>{{state.title}}</h3>'
}, {
  mode: 'replace',
  reactive: true,
  onMount: [
    { type: 'setState', updates: { title: 'Hello World' } }
  ]
})
```

---

### `Render.updateInjection(id, newBlock)`

Update an existing injection with new content.

**Parameters:**
- `id` (string) - Injection ID returned from `inject()`
- `newBlock` (object) - New block definition

**Returns:** Boolean (success)

**Example:**
```javascript
Render.updateInjection(id, {
  type: 'hero',
  title: 'Updated Title'
})
```

---

### `Render.destroyInjection(id)`

Remove an injection and execute cleanup.

**Parameters:**
- `id` (string) - Injection ID

**Returns:** Boolean (success)

**Example:**
```javascript
Render.destroyInjection(id)  // Triggers onUnmount, clears DOM
```

---

### `Render.processInjections(injections)`

Process an array of injection configs (same as `injections` in JSON).

**Parameters:**
- `injections` (array) - Array of injection objects

**Example:**
```javascript
Render.processInjections([
  {
    target: '#banner',
    block: { type: 'hero', title: 'Welcome' }
  },
  {
    target: '#sidebar',
    block: { type: 'html', content: 'Widget' },
    if: 'state.showSidebar'
  }
])
```

---

### `Render.createStream(selector, options)`

Create a streaming injection for real-time JSON parsing.

**Parameters:**
- `selector` (string) - Target element
- `options` (object) - Streaming options

**Options:**
```javascript
{
  debug: false,                          // Log parse attempts
  onProgress: (partial, meta) => {},     // Called on each valid parse
  onComplete: (final, meta) => {},       // Called when stream completes
  onError: (error) => {},                // Called on errors
  reactive: true                         // Make final injection reactive
}
```

**Returns:** Stream object with methods:
- `append(chunk)` - Add JSON chunk
- `complete()` - Finalize stream
- `cancel()` - Abort stream
- `getState()` - Get parser state

**Example:**
```javascript
const stream = Render.createStream('#llm-output', {
  onProgress: (partial) => console.log('Partial:', partial),
  onComplete: (final) => console.log('Done:', final)
})

// Simulate LLM streaming
stream.append('{"type": "section", ')
stream.append('"title": "Streaming Example", ')
stream.append('"cards": [')
stream.append('  {"type": "html", "content": "Card 1"}')
stream.append(']}')
stream.complete()
```

---

## JSON Manifest

Define injections in `site.json` alongside pages.

### Basic Injection

```json
{
  "site": { "title": "My Site" },
  "injections": [
    {
      "target": "#banner",
      "block": {
        "type": "hero",
        "title": "Welcome",
        "subtitle": "Injected from JSON"
      }
    }
  ],
  "pages": [...]
}
```

### With Conditional

```json
{
  "injections": [
    {
      "target": "#admin-panel",
      "if": "state.isAdmin",
      "block": {
        "type": "html",
        "content": "<p>Admin controls</p>"
      }
    }
  ]
}
```

### With Data Fetching

```json
{
  "injections": [
    {
      "target": "#dashboard",
      "fetch": {
        "url": "https://api.example.com/stats",
        "saveAs": "dashboardStats"
      },
      "loading": {
        "type": "html",
        "content": "<div class='loading'>Loading dashboard...</div>"
      },
      "error": {
        "type": "html",
        "content": "<div class='error'>Failed to load</div>"
      },
      "block": {
        "type": "html",
        "content": "<p>Total Users: {{state.dashboardStats.users}}</p>"
      }
    }
  ]
}
```

### Multiple Injections

```json
{
  "injections": [
    {
      "id": "header-banner",
      "target": "#top-banner",
      "mode": "replace",
      "block": { ... }
    },
    {
      "id": "sidebar-widget",
      "target": "#sidebar",
      "mode": "append",
      "block": { ... }
    },
    {
      "id": "footer-cta",
      "target": "#footer-slot",
      "mode": "prepend",
      "block": { ... }
    }
  ]
}
```

---

## Streaming API

### Progressive Rendering

The streaming parser handles incomplete JSON gracefully:

```javascript
const stream = Render.createStream('#output')

// Incomplete JSON is auto-completed and rendered
stream.append('{"type": "hero"')        // Renders: {"type": "hero"}
stream.append(', "title": "Hello')      // Renders: {"type": "hero", "title": "Hello"}
stream.append(' World"}')               // Renders: {"type": "hero", "title": "Hello World"}
stream.complete()                       // Final render
```

### Visual Feedback

Incomplete content gets `.streaming-incomplete` class:

```css
.streaming-incomplete {
  opacity: 0.7;
  position: relative;
}

.streaming-incomplete::after {
  content: '...';
  animation: pulse 1s infinite;
}
```

### Error Recovery

Parser gracefully handles malformed JSON:

```javascript
const stream = Render.createStream('#output', {
  onError: (err) => {
    console.error('Stream error:', err)
    // Show fallback UI
  }
})

// Even if JSON is broken, parser shows last valid state
stream.append('{"type": "hero", "title": "Test')  // Missing closing brace
stream.complete()  // Auto-completes to valid JSON
```

---

## Lifecycle Hooks

### onMount Actions

Execute actions when injection mounts:

```javascript
Render.inject('#widget', {
  type: 'html',
  content: '<p>Data: {{state.data}}</p>'
}, {
  onMount: [
    {
      type: 'fetch',
      url: 'https://api.example.com/data',
      saveAs: 'data'
    },
    {
      type: 'setState',
      updates: { widgetLoaded: true }
    }
  ]
})
```

### onUnmount Cleanup

Clean up when injection is destroyed:

```javascript
const id = Render.inject('#timer', {
  type: 'html',
  content: '<p>Timer running...</p>'
}, {
  onUnmount: [
    {
      type: 'setState',
      updates: { timerActive: false }
    }
  ]
})

// Later...
Render.destroyInjection(id)  // Triggers onUnmount
```

### Fetch Shorthand

Simplified syntax for fetching data:

```javascript
// Instead of onMount with fetch action...
Render.inject('#widget', {...}, {
  fetch: {
    url: '/api/data',
    saveAs: 'widgetData'
  }
})

// Expands to:
onMount: [{
  type: 'fetch',
  url: '/api/data',
  saveAs: 'widgetData'
}]
```

---

## State Management

### Reactive Injections

Injections automatically re-render when state changes:

```javascript
// Initial injection
Render.inject('#counter', {
  type: 'html',
  content: '<p>Count: {{state.count}}</p>'
}, {
  reactive: true  // Default
})

// Change state - injection re-renders automatically
Render.state.count = 42
```

### Disable Reactivity

```javascript
Render.inject('#static', {
  type: 'html',
  content: '<p>Static content</p>'
}, {
  reactive: false  // Won't re-render on state changes
})
```

### State in Conditionals

```json
{
  "injections": [
    {
      "if": "state.isLoggedIn && !state.hasSeenWelcome",
      "target": "#welcome-banner",
      "block": {
        "type": "hero",
        "title": "Welcome, {{state.userName}}!"
      }
    }
  ]
}
```

---

## Examples

### Example 1: LLM Chat Interface

```javascript
// User asks LLM to create a component
const userPrompt = "Create a pricing table"

// LLM streams JSON response
const stream = Render.createStream('#llm-output', {
  onProgress: (partial) => {
    console.log('LLM is generating:', partial.type)
  },
  onComplete: (final) => {
    console.log('Component ready:', final)
  }
})

// Connect to LLM API
const response = await fetch('/api/llm/generate', {
  method: 'POST',
  body: JSON.stringify({ prompt: userPrompt })
})

const reader = response.body.getReader()
while (true) {
  const { done, value } = await reader.read()
  if (done) break

  const chunk = new TextDecoder().decode(value)
  stream.append(chunk)
}

stream.complete()
```

### Example 2: User Dashboard

```json
{
  "site": {
    "state": {
      "isLoggedIn": false,
      "userName": "Guest"
    }
  },
  "injections": [
    {
      "target": "#dashboard",
      "if": "state.isLoggedIn",
      "onMount": [
        {
          "type": "fetch",
          "url": "https://api.example.com/user/profile",
          "saveAs": "profile"
        },
        {
          "type": "fetch",
          "url": "https://api.example.com/user/stats",
          "saveAs": "stats"
        }
      ],
      "loading": {
        "type": "html",
        "content": "<div class='skeleton'>Loading dashboard...</div>"
      },
      "block": {
        "type": "section",
        "title": "Welcome, {{state.profile.name}}",
        "cards": [
          {
            "type": "html",
            "content": "<p>Total Projects: {{state.stats.projects}}</p>"
          },
          {
            "type": "html",
            "content": "<p>Active Tasks: {{state.stats.tasks}}</p>"
          }
        ]
      }
    }
  ]
}
```

### Example 3: Conditional Banners

```javascript
// Show different banners based on user state
const banners = [
  {
    condition: '!state.isLoggedIn',
    banner: {
      type: 'hero',
      title: 'Join Today',
      cta: { text: 'Sign Up', url: '/signup' }
    }
  },
  {
    condition: 'state.isLoggedIn && state.isPremium',
    banner: {
      type: 'hero',
      title: 'Premium Member',
      subtitle: 'Thanks for your support!'
    }
  },
  {
    condition: 'state.isLoggedIn && !state.isPremium',
    banner: {
      type: 'hero',
      title: 'Upgrade to Premium',
      cta: { text: 'Upgrade', url: '/upgrade' }
    }
  }
]

// Inject first matching banner
for (const { condition, banner } of banners) {
  const matches = eval(condition)  // In real code, use ExpressionEvaluator
  if (matches) {
    Render.inject('#top-banner', banner)
    break
  }
}
```

### Example 4: Multi-Component Dashboard

```javascript
// Complex dashboard with multiple data sources
const id = Render.inject('#user-dashboard', {
  type: 'html',
  content: `
    <div class="dashboard-grid">
      <div class="stats">
        <h3>Your Stats</h3>
        <p>Projects: {{state.userStats.projects}}</p>
        <p>Tasks: {{state.userStats.tasks}}</p>
      </div>
      <div class="recent-activity">
        <h3>Recent Activity</h3>
        <ul>
          {{#each state.recentActivity}}
            <li>{{this.action}} - {{this.date}}</li>
          {{/each}}
        </ul>
      </div>
      <div class="team-members">
        <h3>Team</h3>
        {{#each state.teamMembers}}
          <div class="member">
            <img src="{{this.avatar}}" alt="{{this.name}}">
            <span>{{this.name}}</span>
          </div>
        {{/each}}
      </div>
    </div>
  `
}, {
  onMount: [
    {
      type: 'fetch',
      url: 'https://api.example.com/user/stats',
      saveAs: 'userStats'
    },
    {
      type: 'fetch',
      url: 'https://api.example.com/user/activity',
      saveAs: 'recentActivity'
    },
    {
      type: 'fetch',
      url: 'https://api.example.com/team/members',
      saveAs: 'teamMembers'
    }
  ],
  loading: {
    type: 'html',
    content: `
      <div class="dashboard-skeleton">
        <div class="skeleton-block"></div>
        <div class="skeleton-block"></div>
        <div class="skeleton-block"></div>
      </div>
    `
  },
  error: {
    type: 'html',
    content: `
      <div class="error-state">
        <h3>Failed to load dashboard</h3>
        <button onclick="location.reload()">Retry</button>
      </div>
    `
  }
})
```

---

## API Reference

### Injection Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `mode` | string | `'replace'` | How to inject: `'replace'`, `'append'`, or `'prepend'` |
| `reactive` | boolean | `true` | Re-render when state changes |
| `onMount` | array | `null` | Actions to execute on mount |
| `onUnmount` | array | `null` | Actions to execute on destroy |
| `fetch` | object | `null` | Auto-fetch config (shorthand for onMount fetch) |
| `loading` | object | `null` | Block to show while onMount executes |
| `error` | object | `null` | Block to show if onMount fails |

### Fetch Config

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `url` | string | Yes | API endpoint |
| `saveAs` | string | Yes | State key to save response |
| `method` | string | No | HTTP method (default: `'GET'`) |
| `headers` | object | No | HTTP headers |
| `params` | object | No | Query params (GET) or body (POST/PUT) |

### Stream Methods

| Method | Parameters | Returns | Description |
|--------|-----------|---------|-------------|
| `append(chunk)` | chunk (string) | - | Add JSON chunk to buffer |
| `complete()` | - | final JSON | Finalize and render final version |
| `cancel()` | - | - | Abort stream and cleanup |
| `getState()` | - | object | Get parser state (buffer, attempts, etc.) |

### Action Types

Supported in `onMount` and `onUnmount`:

| Type | Properties | Description |
|------|-----------|-------------|
| `fetch` | `url`, `saveAs`, `method`, `params`, `headers` | Fetch data from API |
| `setState` | `updates` | Update state properties |
| `navigate` | `path` | Navigate to route |
| `resetState` | `keys` (optional) | Reset state to initial values |
| `logout` | `redirect` (optional) | Clear state and logout |

---

## Best Practices

### 1. Use IDs for Complex Injections

```javascript
const id = Render.inject('#widget', {...}, { id: 'my-widget' })
// Later, update or destroy by ID
Render.updateInjection('my-widget', newBlock)
```

### 2. Always Handle Loading States

```javascript
Render.inject('#data-widget', {...}, {
  fetch: { ... },
  loading: { type: 'html', content: 'Loading...' },
  error: { type: 'html', content: 'Error occurred' }
})
```

### 3. Clean Up Properly

```javascript
// Store ID for cleanup
const widgets = []

// On create
widgets.push(Render.inject('#slot-1', {...}))

// On cleanup (e.g., page navigation)
widgets.forEach(id => Render.destroyInjection(id))
```

### 4. Use Conditionals in JSON

Instead of programmatic if/else, use `if` property:

```json
{
  "injections": [
    { "if": "state.showBanner", "target": "#banner", "block": {...} },
    { "if": "!state.showBanner", "target": "#banner", "block": {...} }
  ]
}
```

### 5. Throttle Stream Updates

For very fast streams, consider throttling:

```javascript
let buffer = ''
const throttleMs = 100

setInterval(() => {
  if (buffer) {
    stream.append(buffer)
    buffer = ''
  }
}, throttleMs)

// Accumulate chunks
llmStream.on('data', chunk => {
  buffer += chunk
})
```

---

## Troubleshooting

### Injection Not Rendering

**Problem:** `inject()` returns null

**Solution:** Check that:
1. Target element exists: `document.querySelector('#target')`
2. Block definition is valid
3. No JavaScript errors in console

### State Changes Don't Update Injection

**Problem:** Injection doesn't re-render on state change

**Solution:**
1. Ensure `reactive: true` (default)
2. Check that state is changed via `Render.state.prop = value`
3. Verify block uses `{{state.prop}}` syntax

### Streaming Stops Working

**Problem:** Stream doesn't render updates

**Solution:**
1. Check for JSON syntax errors in chunks
2. Enable debug: `createStream('#target', { debug: true })`
3. Verify `onProgress` callback isn't throwing errors

### Fetch Fails Silently

**Problem:** `onMount` fetch doesn't show error

**Solution:**
1. Add `error` block to show failures
2. Check network tab for HTTP errors
3. Verify API URL is correct and CORS is enabled

---

## FAQ

**Q: Can injections use components defined in `components`?**
A: Yes! Use `$ref`:
```javascript
Render.inject('#target', {
  $ref: 'my-component',
  title: 'Hello'
})
```

**Q: Do injections work without v2 features?**
A: Core injection works with v1, but onMount/fetch require ActionExecutor (v2).

**Q: Can I inject into routed pages?**
A: Yes! Injections are independent of routing. You can inject into elements that exist on routed pages.

**Q: How do I debug streaming issues?**
A: Use `debug: true` option:
```javascript
Render.createStream('#target', { debug: true })
```

**Q: Can I use loops/conditionals in injected blocks?**
A: Yes! All block types (each, if, $ref, etc.) work in injections.

---

## Next Steps

- See `examples/injection-demo.html` for live examples
- See `examples/streaming-demo.html` for LLM streaming simulation
- Check `INJECTION_PLAN.md` for implementation details
- Read `README.md` for full DeclarativeWeb documentation

---

**Happy Injecting! 🚀**
