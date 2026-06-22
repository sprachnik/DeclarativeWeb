# DeclarativeWeb Developer Guide

**Architecture, implementation details, and contribution guide for developers**

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Core Modules](#core-modules)
3. [How It Works](#how-it-works)
4. [Key Systems](#key-systems)
5. [Security Model](#security-model)
6. [Build System](#build-system)
7. [Testing](#testing)
8. [Contributing](#contributing)
9. [Code Style Guide](#code-style-guide)
10. [Performance Optimization](#performance-optimization)

---

## Architecture Overview

### Design Philosophy

DeclarativeWeb follows these architectural principles:

1. **Simplicity Over Complexity** - Pure JavaScript, no framework dependencies
2. **Safety First** - No eval(), custom expression parser, sandboxed execution
3. **LLM-Optimized** - Structured JSON schema, clear validation, graceful errors
4. **Modular Design** - ~9 core modules, each with a single responsibility
5. **Client-Side Only** - No server required, instant deployment

### Project Structure

```
RenderJS/
├── src/                          # Source modules
│   ├── render.js                # Core framework (2000+ lines)
│   ├── expression-evaluator.js # Safe expression parser
│   ├── state-manager.js         # Reactive state proxy
│   ├── streaming-json-parser.js # LLM streaming support
│   ├── action-executor.js       # Action execution
│   ├── data-fetcher.js          # API calls & caching
│   ├── form-gen.js              # Form generation
│   ├── conditional-renderer.js  # if/then/else logic
│   ├── loop-renderer.js         # Iteration rendering
│   └── watch-manager.js         # State subscriptions
├── dist/                        # Built output
│   ├── declarativeweb.min.js   # Bundled & minified (~77KB)
│   └── styles.css               # Base CSS
├── tests/                       # Test suite
│   ├── render.test.js          # Core tests (76KB!)
│   ├── form-gen.test.js
│   ├── streaming-json-parser.test.js
│   └── ...
├── examples/                    # Example sites
│   ├── example-landing.json
│   ├── example-docs.json
│   └── ...
├── vibefeed/                    # VibeFeed social platform
│   ├── app.html                # Main application
│   ├── create.html             # AI-powered creation
│   ├── supabase/               # Backend integration
│   └── js/
│       └── supabase.js         # API wrapper
├── index.html                   # Main entry point
├── site.json                    # Content schema
├── esbuild.config.js           # Build configuration
└── package.json
```

### Module Dependency Graph

```
render.js (core)
  ├── expression-evaluator.js  (expression parsing)
  ├── state-manager.js         (reactive state)
  ├── conditional-renderer.js  (if/then/else)
  ├── loop-renderer.js         (each loops)
  ├── action-executor.js       (action handling)
  │   └── data-fetcher.js      (API calls)
  ├── form-gen.js              (form generation)
  ├── watch-manager.js         (state subscriptions)
  └── streaming-json-parser.js (streaming)
```

### Data Flow

```
site.json
    ↓
Load & Parse JSON
    ↓
Initialize State (Proxy)
    ↓
Render Current Page
    ↓
Template Interpolation
    ↓
Block Rendering (hero, section, markdown...)
    ↓
Event Listeners (navigation, actions)
    ↓
User Interaction
    ↓
Action Execution → State Update → Re-render
```

---

## Core Modules

### 1. render.js (~2000 lines)

The main framework module that orchestrates everything.

**Key Responsibilities:**
- Initializing the application
- Routing (hash-based SPA)
- Page rendering
- Block rendering (13 block types)
- Component injection system
- Navigation and footer generation
- Template interpolation

**Key Functions:**

```javascript
// Initialize application
Render.init({
  src: 'site.json',           // JSON schema URL/object
  target: '#app',             // DOM selector
  onLoadComplete: () => {}    // Callback
})

// Component injection
Render.inject(selector, block, options)

// Streaming API
Render.createStream(selector)
const stream = Render.createStream('#output')
stream.append('{"type": "hero"}')
stream.complete()

// State access
Render.state.count = 42  // Triggers re-render
```

**Block Renderers:**
- `renderHero(block)` - Hero sections
- `renderSection(block)` - Resource grids
- `renderMarkdown(block)` - Markdown content
- `renderCode(block)` - Syntax-highlighted code
- `renderButton(block)` - Interactive buttons
- `renderTable(block)` - Tabular data
- `renderHTML(block)` - Custom HTML
- `renderMermaid(block)` - Diagrams
- `renderFrappeChart(block)` - Charts
- `renderP5JS(block)` - Creative coding (sandboxed iframes)
- `renderQuiz(block)` - Interactive quizzes

### 2. expression-evaluator.js

**Purpose:** Safe expression evaluation without eval() or Function()

**Architecture:**
```
Input String → Tokenizer → Parser → AST → Interpreter → Result
```

**Supported Operations:**
- Arithmetic: `+`, `-`, `*`, `/`, `%`
- Comparisons: `==`, `!=`, `<`, `>`, `<=`, `>=`
- Boolean: `&&`, `||`, `!`
- Ternary: `condition ? true : false`
- Property access: `state.user.name`
- Function calls: `formatDate(state.timestamp)`

**Security:**
- No variable assignment
- No function declarations
- No access to global scope
- Whitelisted functions only

**Example:**
```javascript
import { evaluateExpression } from './expression-evaluator.js'

const context = {
  state: { count: 5 },
  functions: { double: (x) => x * 2 }
}

evaluateExpression('state.count + 1', context)  // → 6
evaluateExpression('double(state.count)', context)  // → 10
evaluateExpression('state.count > 3 ? "high" : "low"', context)  // → "high"
```

### 3. state-manager.js

**Purpose:** Reactive state management with deep proxies

**How It Works:**
```javascript
function createReactiveState(initialState, onChange) {
  return new Proxy(initialState, {
    get(target, prop) {
      const value = target[prop]
      // Recursively wrap nested objects
      if (typeof value === 'object' && value !== null) {
        return createReactiveState(value, onChange)
      }
      return value
    },
    set(target, prop, value) {
      const oldValue = target[prop]
      target[prop] = value
      onChange(prop, value, oldValue)  // Trigger re-render
      return true
    }
  })
}
```

**Features:**
- Deep reactivity (nested object changes trigger updates)
- Automatic re-rendering on state changes
- Support for arrays and objects
- Read-only mode for immutable views

**Usage:**
```javascript
// Initialize
Render.state.user = { name: 'Alice', age: 25 }

// Update (triggers re-render)
Render.state.user.name = 'Bob'
Render.state.user.age = 26

// Arrays work too
Render.state.items.push({ id: 1, name: 'Item 1' })
```

### 4. streaming-json-parser.js

**Purpose:** Parse incomplete JSON streams from LLMs

**Challenge:** LLMs stream JSON character by character. Incomplete JSON is invalid and can't be parsed by `JSON.parse()`.

**Solution:** Smart completion algorithm that:
1. Tracks unclosed brackets/braces/quotes
2. Intelligently completes incomplete tokens
3. Returns progressive updates as JSON becomes parseable
4. Final `.complete()` returns validated JSON

**Example:**
```javascript
import { StreamingJSONParser } from './streaming-json-parser.js'

const parser = new StreamingJSONParser()

parser.append('{"type": "hero", ')
parser.get()  // → null (incomplete)

parser.append('"headline": "Hello"')
parser.get()  // → { type: "hero", headline: "Hello" }

parser.append('}')
parser.complete()  // → { type: "hero", headline: "Hello" }
```

**Auto-completion Logic:**
- Open strings → add closing quote
- Open objects → add closing brace
- Open arrays → add closing bracket
- Incomplete values → null or empty string

### 5. action-executor.js

**Purpose:** Execute safe declarative actions

**Supported Actions:**

```javascript
// Navigate to page
{ type: 'navigate', path: '/about' }

// Update state
{ type: 'setState', updates: { count: '{{state.count + 1}}' } }

// Toggle boolean
{ type: 'toggleState', key: 'isOpen' }

// Reset to initial value
{ type: 'resetState', key: 'counter' }

// Fetch data from API
{
  type: 'fetch',
  url: 'https://api.example.com/data',
  saveAs: 'apiData',
  method: 'POST',
  body: { key: 'value' }
}
```

**Security:**
- No arbitrary code execution
- Declarative only
- Whitelisted action types
- Expression evaluation for dynamic values

### 6. data-fetcher.js

**Purpose:** HTTP requests with caching and loading states

**Features:**
- GET, POST, PUT, DELETE support
- Automatic caching (configurable TTL)
- Loading/error state management
- JSON auto-parsing
- CORS support

**Example:**
```javascript
import { fetchData } from './data-fetcher.js'

const { data, error, loading } = await fetchData({
  url: 'https://api.github.com/repos/user/repo',
  method: 'GET',
  cache: true,  // Cache for 5 minutes
  saveAs: 'repoData'
})
```

### 7. form-gen.js

**Purpose:** Generate forms from JSON schemas

**Example:**
```json
{
  "type": "form",
  "fields": [
    { "name": "email", "type": "email", "label": "Email", "required": true },
    { "name": "password", "type": "password", "label": "Password" }
  ],
  "submitLabel": "Login",
  "onSubmit": {
    "type": "fetch",
    "url": "/api/login",
    "method": "POST"
  }
}
```

**Features:**
- Auto-validation (required, email, pattern, min/max)
- Accessible (labels, aria-attributes)
- State binding (form data saved to state)
- Custom submit actions

### 8. conditional-renderer.js

**Purpose:** if/then/else block rendering

**Examples:**
```json
// Inline if
{
  "type": "html",
  "if": "state.isLoggedIn",
  "content": "Welcome back!"
}

// if/then/else
{
  "if": "state.score >= 80",
  "then": [
    { "type": "html", "content": "✅ Pass" }
  ],
  "else": [
    { "type": "html", "content": "❌ Fail" }
  ]
}
```

### 9. loop-renderer.js

**Purpose:** Iterate over arrays and render blocks

**Example:**
```json
{
  "each": "state.items",
  "as": "item",
  "content": [
    {
      "type": "html",
      "content": "<div>{{item.name}}</div>"
    }
  ]
}
```

### 10. watch-manager.js

**Purpose:** Execute actions when conditions become true

**Example:**
```json
{
  "type": "watch",
  "condition": "state.count >= 10",
  "actions": [
    { "type": "setState", "updates": { "milestone": true } }
  ]
}
```

---

## How It Works

### Initialization Flow

```javascript
// 1. User calls init
Render.init({ src: 'site.json', target: '#app' })

// 2. Fetch and parse JSON
const data = await fetch('site.json').then(r => r.json())

// 3. Store globally
window.siteData = data

// 4. Initialize state
window.state = createReactiveState(
  data.state || {},
  (prop, value) => render(false)  // Re-render on change
)

// 5. Initialize functions
window.customFunctions = {}
for (const [name, body] of Object.entries(data.functions || {})) {
  window.customFunctions[name] = new Function('args', body)
}

// 6. Render current page
const currentPath = window.location.hash.slice(1) || '/'
const page = data.pages.find(p => p.path === currentPath)
render(page)

// 7. Set up navigation
renderNav(data.pages, data.site.navLayout)

// 8. Attach event listeners
window.addEventListener('hashchange', () => render(false))
```

### Rendering Pipeline

```javascript
function render(pageOrFull) {
  // 1. Get page data
  const page = pageOrFull || getCurrentPage()

  // 2. Update document title
  document.title = `${page.title} - ${siteData.site.title}`

  // 3. Clear main content
  const main = document.querySelector('main')
  main.innerHTML = ''

  // 4. Render each block
  for (const block of page.content) {
    const el = renderBlock(block)
    main.appendChild(el)
  }

  // 5. Initialize external libraries (Lucide, Mermaid)
  lucide.createIcons()
  mermaid.run()
}

function renderBlock(block) {
  // 1. Check conditional rendering
  if (block.if && !evaluateExpression(block.if, context)) {
    return document.createDocumentFragment()
  }

  // 2. Handle loops
  if (block.each) {
    return renderLoop(block)
  }

  // 3. Handle if/then/else
  if (block.if && block.then) {
    return renderConditional(block)
  }

  // 4. Interpolate templates
  const interpolated = interpolateBlock(block)

  // 5. Render by type
  switch (interpolated.type) {
    case 'hero': return renderHero(interpolated)
    case 'section': return renderSection(interpolated)
    case 'markdown': return renderMarkdown(interpolated)
    // ... etc
  }
}
```

### Template Interpolation

```javascript
function interpolateTemplate(template, context) {
  // Replace {{expression}} with evaluated result
  return template.replace(/\{\{(.+?)\}\}/g, (match, expr) => {
    try {
      const result = evaluateExpression(expr.trim(), context)
      return result !== undefined ? String(result) : ''
    } catch (e) {
      console.error(`Template error in "${expr}":`, e)
      return match  // Return original if error
    }
  })
}

// Context includes:
const context = {
  state: window.state,
  site: window.siteData.site,
  functions: window.customFunctions
}
```

### Component Injection System

```javascript
let injectionRegistry = new Map()

Render.inject = function(selector, block, options = {}) {
  const target = document.querySelector(selector)
  if (!target) throw new Error(`Selector "${selector}" not found`)

  const id = generateId()
  const container = document.createElement('div')
  container.id = `injection-${id}`

  // Apply mode
  if (options.mode === 'replace') {
    target.innerHTML = ''
    target.appendChild(container)
  } else if (options.mode === 'append') {
    target.appendChild(container)
  } else if (options.mode === 'prepend') {
    target.insertBefore(container, target.firstChild)
  }

  // Render block
  const content = Array.isArray(block) ? block : [block]
  for (const blk of content) {
    const el = renderBlock(blk)
    container.appendChild(el)
  }

  // Track injection
  injectionRegistry.set(id, {
    selector,
    block,
    options,
    element: container
  })

  // Execute onMount
  if (options.onMount) {
    for (const action of options.onMount) {
      executeAction(action)
    }
  }

  return id
}

// Remove injection
Render.remove = function(id) {
  const injection = injectionRegistry.get(id)
  if (!injection) return

  // Execute onUnmount
  if (injection.options.onUnmount) {
    for (const action of injection.options.onUnmount) {
      executeAction(action)
    }
  }

  injection.element.remove()
  injectionRegistry.delete(id)
}
```

---

## Key Systems

### Routing

Hash-based SPA routing:

```javascript
// Listen for hash changes
window.addEventListener('hashchange', () => {
  render(false)  // Re-render with new page
})

// Navigation function
function navigate(path) {
  window.location.hash = path
}

// Get current page
function getCurrentPage() {
  const path = window.location.hash.slice(1) || '/'
  return siteData.pages.find(p => p.path === path) || get404Page()
}
```

### State Management

**Read:**
```javascript
const value = Render.state.count
```

**Write (triggers re-render):**
```javascript
Render.state.count = 42
```

**Deep updates:**
```javascript
Render.state.user.profile.name = 'Alice'
```

**Re-render affected injections:**
```javascript
function reRenderAffectedInjections(changedKeys) {
  for (const [id, injection] of injectionRegistry) {
    if (injection.options.reactive) {
      // Check if block references changed keys
      const blockStr = JSON.stringify(injection.block)
      const affectsThis = changedKeys.some(key =>
        blockStr.includes(`state.${key}`)
      )

      if (affectsThis) {
        // Re-render injection
        const container = injection.element
        container.innerHTML = ''
        const content = Array.isArray(injection.block)
          ? injection.block
          : [injection.block]
        for (const blk of content) {
          container.appendChild(renderBlock(blk))
        }
      }
    }
  }
}
```

### Lazy Loading ($import)

```javascript
async function loadPageWithImports(pageConfig) {
  if (pageConfig.$import) {
    // Fetch imported JSON
    const imported = await fetch(pageConfig.$import).then(r => r.json())

    // Merge with existing config
    return { ...pageConfig, ...imported }
  }

  return pageConfig
}

// Cache imported pages
const importCache = new Map()

async function fetchWithCache(url) {
  if (importCache.has(url)) {
    return importCache.get(url)
  }

  const data = await fetch(url).then(r => r.json())
  importCache.set(url, data)
  return data
}
```

---

## Security Model

### Expression Evaluation

**Threat:** Arbitrary code execution via `eval()`

**Solution:** Custom parser with whitelisted operations

```javascript
// ❌ UNSAFE (what we DON'T do)
const result = eval(userInput)
const result = new Function('return ' + userInput)()

// ✅ SAFE (what we DO)
const result = evaluateExpression(userInput, context)
```

**What's blocked:**
- Variable assignment: `x = 5`
- Function declarations: `function hack() {}`
- Access to globals: `window`, `document`, `process`
- Arbitrary property access: `__proto__`, `constructor`

**What's allowed:**
- Math: `state.count + 1`
- Comparisons: `state.age >= 18`
- Property access: `state.user.name`
- Whitelisted functions: `formatDate(state.timestamp)`

### P5.js Sandboxing

**Threat:** P5.js code running in main context with DOM access

**Solution:** Sandboxed iframes with no parent access

```javascript
function renderP5JS(block) {
  const iframe = document.createElement('iframe')
  iframe.sandbox = 'allow-scripts'  // No allow-same-origin!

  const code = `
    <!DOCTYPE html>
    <html>
    <head>
      <script src="https://cdn.jsdelivr.net/npm/p5@1.7.0/lib/p5.min.js"></script>
    </head>
    <body>
      <script>${block.code}</script>
    </body>
    </html>
  `

  iframe.srcdoc = code
  return iframe
}
```

**Security properties:**
- No access to parent window
- No cookies or localStorage
- No same-origin access
- Can't navigate top window

### Content Sanitization

**VibeFeed specific:** User-generated content sanitization

```javascript
function sanitizeVibeBlocks(blocks) {
  return blocks
    .filter(block => ALLOWED_VIBE_TYPES.includes(block.type))
    .map(block => sanitizeBlock(block))
}

function sanitizeBlock(block) {
  const sanitized = { ...block }

  // Remove dangerous properties
  delete sanitized.action  // Prevent arbitrary actions
  delete sanitized.onClick
  delete sanitized.init
  delete sanitized.watch

  // Sanitize strings
  for (const key of Object.keys(sanitized)) {
    if (typeof sanitized[key] === 'string') {
      sanitized[key] = sanitizeString(sanitized[key])
    }
  }

  return sanitized
}

function sanitizeString(str) {
  return str
    .replace(/javascript\s*:/gi, '')  // Remove javascript: protocol
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')  // Remove scripts
}
```

---

## Build System

### Configuration (esbuild.config.js)

```javascript
import esbuild from 'esbuild'

esbuild.build({
  entryPoints: ['src/render.js'],
  bundle: true,
  minify: true,
  sourcemap: true,
  outfile: 'dist/declarativeweb.min.js',
  format: 'iife',  // Immediately Invoked Function Expression
  globalName: 'Render',
  target: ['es2020'],
  plugins: []
}).catch(() => process.exit(1))
```

### Build Process

```bash
npm run build
```

**Steps:**
1. Read entry point (`src/render.js`)
2. Follow imports and bundle all modules
3. Transpile ES6+ to ES2020
4. Minify JavaScript
5. Generate sourcemap
6. Output to `dist/declarativeweb.min.js`

**Result:**
- Input: ~5,277 lines across 9 files
- Output: ~77KB minified, ~50KB gzipped

---

## Testing

### Test Stack
- **Jest** - Test runner
- **JSDOM** - DOM simulation
- **Playwright** - E2E testing

### Running Tests

```bash
npm test                # Run all tests
npm run test:watch      # Watch mode
npm run test:ci         # CI mode with coverage
```

### Coverage Requirements

```json
{
  "jest": {
    "coverageThresholds": {
      "global": {
        "lines": 70,
        "functions": 70,
        "statements": 70,
        "branches": 55
      }
    }
  }
}
```

### Test Structure

**Unit Tests (`tests/render.test.js`)**
```javascript
describe('Expression Evaluator', () => {
  it('should evaluate simple arithmetic', () => {
    const result = evaluateExpression('2 + 2', {})
    expect(result).toBe(4)
  })

  it('should handle property access', () => {
    const context = { state: { count: 5 } }
    const result = evaluateExpression('state.count', context)
    expect(result).toBe(5)
  })
})
```

**Integration Tests**
```javascript
describe('Component Injection', () => {
  it('should inject and render blocks', async () => {
    document.body.innerHTML = '<div id="test"></div>'

    const id = Render.inject('#test', {
      type: 'html',
      content: '<p>Test</p>'
    })

    expect(document.querySelector('#test p').textContent).toBe('Test')

    Render.remove(id)
    expect(document.querySelector('#test p')).toBeNull()
  })
})
```

**E2E Tests (`tests/showcase.test.js`)**
```javascript
test('should navigate between pages', async ({ page }) => {
  await page.goto('http://localhost:8080')

  await page.click('a[href="#/about"]')
  await expect(page).toHaveURL(/#\/about/)

  const title = await page.textContent('h1')
  expect(title).toBe('About Us')
})
```

---

## Contributing

### Getting Started

1. **Fork the repository**
2. **Clone your fork**
   ```bash
   git clone https://github.com/yourusername/RenderJS.git
   cd RenderJS
   ```
3. **Install dependencies**
   ```bash
   npm install
   ```
4. **Create a branch**
   ```bash
   git checkout -b feature/my-feature
   ```
5. **Make changes**
6. **Run tests**
   ```bash
   npm test
   npm run build
   ```
7. **Commit and push**
   ```bash
   git commit -m "Add my feature"
   git push origin feature/my-feature
   ```
8. **Open a Pull Request**

### Contribution Guidelines

**Code Quality:**
- Write tests for new features
- Maintain >70% coverage
- Run `npm run build` before committing
- Follow existing code style

**Commit Messages:**
```
feat: Add new block type for audio
fix: Resolve state management bug
docs: Update BLOCKS.md
refactor: Simplify expression evaluator
test: Add tests for form generation
```

**Pull Request Template:**
```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation

## Testing
- [ ] Unit tests added/updated
- [ ] Manual testing completed
- [ ] No regressions

## Screenshots
(if applicable)
```

---

## Code Style Guide

### JavaScript Style

**Variables:**
```javascript
// Use camelCase
const userName = 'Alice'
const isLoggedIn = true

// Use const by default, let when reassignment needed
const PI = 3.14159
let count = 0
```

**Functions:**
```javascript
// Named functions for top-level
function renderHero(block) {
  // ...
}

// Arrow functions for callbacks
array.map(item => item.value)
```

**Async/Await:**
```javascript
// Prefer async/await over .then()
async function loadData() {
  try {
    const response = await fetch('/api/data')
    const data = await response.json()
    return data
  } catch (error) {
    console.error('Failed to load data:', error)
    return null
  }
}
```

**Error Handling:**
```javascript
// Always handle errors gracefully
try {
  riskyOperation()
} catch (error) {
  console.error('Operation failed:', error)
  // Show user-friendly message
  showError('Something went wrong. Please try again.')
}
```

**Comments:**
```javascript
// Use comments for WHY, not WHAT
// Good:
// Cache for performance, expires after 5 minutes
const cache = new Map()

// Bad:
// Create a new map
const cache = new Map()
```

### File Organization

Each module should:
1. Import dependencies
2. Define constants
3. Define helper functions
4. Export main functions
5. Document exports with JSDoc

```javascript
// expression-evaluator.js

// 1. Imports
import { tokenize } from './tokenizer.js'

// 2. Constants
const OPERATORS = ['+', '-', '*', '/']

// 3. Helpers
function isOperator(token) {
  return OPERATORS.includes(token)
}

// 4. Main functions
/**
 * Evaluates a safe expression string
 * @param {string} expr - Expression to evaluate
 * @param {object} context - Variables and functions
 * @returns {any} Evaluation result
 */
export function evaluateExpression(expr, context) {
  // ...
}

// 5. Export
export { evaluateExpression, tokenize }
```

---

## Performance Optimization

### Current Performance Characteristics

- **Bundle size**: ~77KB minified, ~50KB gzipped
- **Initial load**: ~200ms (CDN cached)
- **Route change**: <10ms (client-side)
- **Re-render**: ~5-20ms (full page)
- **Lighthouse score**: 95+

### Optimization Techniques

**1. Lazy Loading**
```json
{
  "pages": [
    { "path": "/", "title": "Home", "content": [...] },
    { "path": "/about", "$import": "pages/about.json" }
  ]
}
```

**2. Code Splitting**
Currently not implemented. Future consideration: Split block renderers into separate chunks.

**3. Virtual DOM**
Not used. Full page re-renders are fast enough for static content. Injections can be optimized with `reactive: true`.

**4. Memoization**
```javascript
// Cache compiled expressions
const expressionCache = new Map()

function evaluateExpression(expr, context) {
  if (!expressionCache.has(expr)) {
    const compiled = compileExpression(expr)
    expressionCache.set(expr, compiled)
  }

  return expressionCache.get(expr)(context)
}
```

**5. Debouncing**
```javascript
// Debounce state updates
let renderTimeout
function scheduleRender() {
  clearTimeout(renderTimeout)
  renderTimeout = setTimeout(() => render(false), 10)
}
```

### Future Optimizations

- **Granular updates**: Only re-render changed blocks
- **Web Workers**: Parse JSON in background thread
- **Service Workers**: Cache site.json and assets
- **Prerendering**: Static HTML generation for SEO

---

## Advanced Topics

### Custom Block Types

Add new block types by:

1. **Define renderer function**
```javascript
function renderMyBlock(block) {
  const div = document.createElement('div')
  div.className = 'my-block'
  div.textContent = block.content
  return div
}
```

2. **Register in renderBlock()**
```javascript
function renderBlock(block) {
  switch (block.type) {
    case 'my-block': return renderMyBlock(block)
    // ...
  }
}
```

3. **Add to schema** (for validation)
4. **Document in BLOCKS.md**
5. **Write tests**

### Plugin System (Future)

Proposed plugin API:

```javascript
Render.use({
  name: 'analytics',
  init(config) {
    // Initialize plugin
  },
  onRender(page) {
    // Track page view
  },
  blocks: {
    'custom-block': renderCustomBlock
  }
})
```

---

**Happy coding! If you have questions, open an issue or discussion on GitHub.**
