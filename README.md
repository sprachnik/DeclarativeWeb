# DeclarativeWeb

**A minimal, LLM-friendly JavaScript library for rendering websites from a single JSON schema.**

Zero build step. Pure HTML + JS. Perfect for static sites, documentation, landing pages, and prototypes.

**📖 New to DeclarativeWeb?** Read the complete guides:
- **[What is this?](./PROJECT_OVERVIEW.md)** - Vision and philosophy
- **[How do I use it?](./USER_GUIDE.md)** - Step-by-step tutorial
- **[How does it work?](./DEVELOPER_GUIDE.md)** - Architecture deep dive

---

## Why DeclarativeWeb?

- **LLM-Optimized**: Designed for AI agents to modify without worrying about UX
- **Single File Editing**: Update `site.json` only—never touch HTML/CSS/JS
- **No Build Tools**: Works directly in the browser, no npm/webpack/etc
- **Fully Featured**: Routing, themes, responsive nav, markdown, code blocks
- **Error Handling**: Graceful failures with helpful error messages
- **Flexible Layouts**: Horizontal nav, vertical sidebar, or both

## Quick Start

### 1. File Structure

```
project/
├── index.html
├── dist/
│   └── declarativeweb.min.js
├── styles.css
├── site.json
└── schema.json (optional)
```

### 2. HTML Boilerplate

Create `index.html`:

```html
<!DOCTYPE html>
<html lang="en" data-theme="light">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>My Site</title>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@picocss/pico@2/css/pico.min.css">
  <link rel="stylesheet" href="styles.css">
</head>
<body>
  <div id="app"></div>
  <script src="https://cdn.jsdelivr.net/npm/marked/marked.min.js"></script>
  <script src="https://unpkg.com/lucide@latest"></script>
  <script src="dist/declarativeweb.min.js"></script>
  <script>
    Render.init({ src: 'site.json', target: '#app' })
  </script>
</body>
</html>
```

### 3. Create Your Site

Edit `site.json` to define your content. See [examples/](#examples) below.

### 4. Open in Browser

No server needed for local development! Just open `index.html` in your browser.

For production, serve with any static host (Netlify, Vercel, GitHub Pages, etc.).

## Features

### Content Blocks

Eight block types for any content need:

- **Hero**: Large headers with CTAs
- **Section**: Grid of resource cards
- **Markdown**: GitHub-flavored markdown
- **Code**: Syntax-highlighted code snippets
- **HTML**: Custom HTML with templating
- **Mermaid**: Diagrams and flowcharts
- **Frappe Chart**: Data visualization (line, bar, pie charts)
- **Component References**: Reusable templates

See [BLOCKS.md](./BLOCKS.md) for complete reference.

### Composable JSON with Lazy Loading

**NEW**: Split large JSON files and load pages on-demand!

Split your site into modular JSON files using `$import`:

```json
{
  "site": { "title": "My Site" },
  "pages": [
    { "path": "/", "$import": "pages/home.json" },
    { "path": "/about", "$import": "pages/about.json" }
  ]
}
```

**Benefits:**
- ⚡ **Lazy Loading**: Pages fetched only when navigated to
- 💾 **HTTP Caching**: Imported files cached to avoid redundant requests
- 📁 **Better Organization**: Split site by page or feature
- 🎯 **Smaller Payload**: Main `site.json` stays minimal

**Backward Compatible**: Sites without `$import` work exactly as before.

### Component Injection

**NEW**: Inject components anywhere without routing!

Perfect for:
- LLM-generated components streamed in real-time
- Dynamic dashboards and widgets
- Conditional content based on state
- Data-driven components with auto-fetch

**Quick Example:**

```javascript
// Inject a component programmatically
Render.inject('#sidebar', {
  type: 'html',
  content: '<p>Users: {{state.users.length}}</p>'
}, {
  fetch: {
    url: 'https://api.example.com/users',
    saveAs: 'users'
  },
  loading: { type: 'html', content: 'Loading...' }
})

// Or stream JSON from an LLM
const stream = Render.createStream('#output')
stream.append('{"type": "hero", "title": "')
stream.append('AI Generated"}')
stream.complete()
```

**Declarative Injections:**

```json
{
  "injections": [
    {
      "target": "#banner",
      "if": "state.showBanner",
      "fetch": {
        "url": "/api/banner-data",
        "saveAs": "bannerData"
      },
      "block": {
        "type": "hero",
        "title": "{{state.bannerData.title}}"
      }
    }
  ]
}
```

**Features:**
- ✅ Streaming JSON parser for real-time LLM output
- ✅ Auto-fetch data on mount with loading/error states
- ✅ Reactive state management (auto re-render)
- ✅ Lifecycle hooks (onMount, onUnmount)
- ✅ Multiple injection modes (replace, append, prepend)

See [INJECTION.md](./INJECTION.md) for complete API reference.

**Live Demos:**
- [Injection Demo](./examples/injection-demo.html) - Interactive examples
- [Streaming Demo](./examples/streaming-demo.html) - LLM simulation

### Navigation Layouts

Three layout options via `nav.layout`:

```json
"nav": {
  "layout": "horizontal"  // Top bar (default)
  // or "vertical"         // Sidebar
  // or "both"             // Sidebar + top actions bar
}
```

### Responsive Column Control

Simple or responsive column configurations:

```json
// Simple
"columns": 3

// Responsive
"columns": {
  "mobile": 1,
  "tablet": 2,
  "desktop": 4
}

// Custom grid template
"gridTemplate": "repeat(auto-fit, minmax(250px, 1fr))"
```

### Theming

Built-in light/dark mode with theme toggle:

```json
"site": {
  "defaultTheme": "light"  // or "dark"
}

"nav": {
  "actions": [
    { "type": "theme-toggle" }
  ]
}
```

### Error Handling

- Error cards for malformed blocks
- Helpful error messages in console
- Error modal component for critical failures
- Doesn't break entire page on single block error

## Site JSON Structure

```json
{
  "$schema": "./schema.json",
  "site": {
    "title": "Site Title",
    "description": "SEO description",
    "defaultTheme": "light",
    "state": { "key": "value" }
  },
  "nav": {
    "layout": "horizontal",
    "logo": { "text": "Logo", "icon": "zap" },
    "links": [
      { "label": "Home", "path": "/" }
    ],
    "actions": [
      { "type": "theme-toggle" }
    ]
  },
  "footer": {
    "text": "© {{year()}} Site",
    "links": [
      { "label": "Privacy", "path": "/privacy" }
    ]
  },
  "components": {
    "card": "<div>{{content}}</div>"
  },
  "functions": {
    "year": "() => new Date().getFullYear()"
  },
  "pages": [
    {
      "path": "/",
      "meta": { "title": "Home" },
      "content": [ /* blocks */ ]
    }
  ]
}
```

## Templating

Mustache-style interpolation in any string:

```json
"headline": "Welcome to {{site.title}}"
"text": "Current count: {{state.count}}"
"footer": "© {{year()}} Company"
```

### Available Context

- `{{site.title}}` - Site config values
- `{{state.key}}` - Reactive state values
- `{{funcName()}}` - Custom functions
- `{{funcName(arg)}}` - Functions with arguments

### Component Props

In component templates, all passed props are available:

```json
// Define component
"components": {
  "badge": "<span class=\"tag\">{{text}}</span>"
}

// Use component
{ "$ref": "badge", "text": "New" }
```

## Examples

### Landing Page

```bash
# Use example-landing.json
cp examples/example-landing.json site.json
```

Simple landing page for a SaaS product. Shows hero, features grid, and pricing.

### Documentation Site

```bash
# Use example-docs.json
cp examples/example-docs.json site.json
```

Full docs site with vertical sidebar navigation, code examples, and API reference.

### Blog

```bash
# Use example-blog.json
cp examples/example-blog.json site.json
```

Blog with article cards, categories, and full markdown article pages.

### Full EdTech Platform

The default `site.json` is a complete EdTech platform example with:
- Home page with stats and features
- Course catalog with 8+ courses
- Features page with platform capabilities
- Pricing tiers
- About page with team and impact metrics

## Demo Sub-Apps

Live AI-powered apps built on DeclarativeWeb, all in this repo:

- **[chat.html](./chat.html)** — DeclarativeWeb Chat. Type a request, watch Claude stream JSON blocks into a live preview. Supports patch-protocol updates, version history, template sharing.
- **[playvibe.html](./playvibe.html)** — Kid-friendly game maker. Tap four emoji slots (who / where / learn / style), Claude generates a themed educational mini-quiz that renders instantly. No typing required — designed for varying literacy levels.
- **[vibefeed/](./vibefeed/)** — Social platform demo with auth, feed, and profiles (Supabase-backed).

The Claude-powered demos share `/api/claude` (`netlify/functions/claude-proxy.mjs`). To run them locally:

```bash
npm install -g netlify-cli
netlify login
netlify link        # connects this folder to your Netlify site
netlify dev         # starts on http://localhost:8888
```

Then create a `.env` in the repo root with your Anthropic key:

```
RENDERJS_CLAUDE_KEY=sk-ant-…
```

**Note**: the env var is intentionally named `RENDERJS_CLAUDE_KEY` rather than `ANTHROPIC_API_KEY` because Netlify's built-in AI integration auto-injects `ANTHROPIC_API_KEY` as a JWT for its AI Gateway proxy, which would override anything you set locally. The project-specific name sidesteps that conflict.

## Schema Validation

`schema.json` provides full JSON Schema validation. Use it with:

- **VS Code**: Auto-completion and validation with the `$schema` property
- **Validation Tools**: `ajv`, `jsonschema`, etc.
- **LLM Context**: Help AI agents understand the structure

## Testing

DeclarativeWeb includes comprehensive test coverage with automated testing via GitHub Actions.

### Running Tests Locally

```bash
# Install dependencies
npm install

# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage report
npm run test:ci
```

### Test Coverage

The test suite covers:
- ✅ Framework initialization
- ✅ All content block types (hero, section, markdown, code, html)
- ✅ Navigation rendering (horizontal, vertical, both)
- ✅ Template interpolation and functions
- ✅ Component references
- ✅ Theme management and customization
- ✅ State management
- ✅ Error handling
- ✅ Form generation (FormGen)
- ✅ Round-trip data preservation

Coverage thresholds: 70% for lines, functions, branches, and statements.

### Continuous Integration

Tests run automatically on:
- All commits to `main`, `master`, `develop`, and `claude/**` branches
- All pull requests

The CI pipeline:
1. Runs tests on Node.js 18.x and 20.x
2. Validates all JSON files
3. Checks coverage thresholds
4. Uploads coverage reports to Codecov

See `.github/workflows/test.yml` for the complete CI configuration.

## API Reference

### Render.init(options)

Initialize the framework.

```javascript
Render.init({
  src: 'site.json',    // URL to JSON file
  // or
  data: { ... },       // JSON object directly

  target: '#app'       // CSS selector for container
})
```

### Render.navigate(path)

Programmatic navigation:

```javascript
Render.navigate('/about')
```

### Render.toggleTheme()

Toggle light/dark theme:

```javascript
Render.toggleTheme()
```

### Render.state

Access reactive state:

```javascript
console.log(Render.state.count)
Render.state.count = 42  // Triggers re-render
```

### Render.errors

Access error log:

```javascript
console.log(Render.errors)
// [{ title, message, context, timestamp }, ...]
```

## Browser Support

Works in all modern browsers:

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+

Requires ES6 Proxy support (no IE11).

## Dependencies

Loaded via CDN:

- **Pico CSS**: Minimal CSS framework
- **Marked.js**: Markdown parser
- **Lucide**: Icon library

Total ~50KB (gzipped).

## File Sizes

- `dist/declarativeweb.min.js`: ~68KB (all modules bundled)
- `styles.css`: ~8KB
- `schema.json`: ~5KB
- Total framework: ~81KB

Plus your `site.json` content.

## Performance

- **Initial load**: ~200ms (CDN cached)
- **Route change**: <10ms (client-side)
- **Lighthouse score**: 95+ (out of the box)

## Limitations

- Client-side only (no SSR)
- Single-page app (SPA) routing
- No server-side data fetching
- Limited to what browser can do

Perfect for:
- Documentation sites
- Landing pages
- Portfolios
- Prototypes
- Internal tools
- Static marketing sites

Not ideal for:
- Large e-commerce sites
- Apps requiring SSR/SEO
- Real-time collaboration
- Complex state management

## LLM Usage Guide

This framework is optimized for LLM editing:

### For AI Agents

1. **Read** `BLOCKS.md` to understand available blocks
2. **Edit** only `site.json`
3. **Don't touch** `render.js`, `styles.css`, or `index.html`
4. **Validate** against `schema.json` if possible

### Common LLM Tasks

**Add a new page:**
```json
{
  "path": "/new-page",
  "meta": { "title": "New Page" },
  "content": [ /* blocks */ ]
}
```

**Add a feature card:**
```json
{
  "title": "Feature Name",
  "description": "Feature description",
  "icon": "zap",
  "tags": ["tag1", "tag2"]
}
```

**Change navigation:**
```json
"nav": {
  "links": [
    { "label": "New Link", "path": "/new" }
  ]
}
```

**Update content:**
Just edit the `content` array in any page. No code changes needed!

## Advanced Usage

### Custom Components

Define reusable templates:

```json
"components": {
  "pricing-card": "<article><h3>{{plan}}</h3><p>{{price}}/mo</p><ul>{{#each features}}<li>{{this}}</li>{{/each}}</ul></article>"
}
```

Use anywhere:

```json
{
  "$ref": "pricing-card",
  "plan": "Pro",
  "price": 29,
  "features": ["Feature 1", "Feature 2"]
}
```

### Custom Functions

Add JavaScript functions:

```json
"functions": {
  "formatCurrency": "(amount) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount)"
}
```

Use in templates:

```
Price: {{formatCurrency(29.99)}}
```

### Reactive State

State triggers re-render on change:

```json
"site": {
  "state": {
    "count": 0
  }
}
```

Access via JavaScript:

```javascript
Render.state.count++  // Increments and re-renders
```

## Troubleshooting

### Page not rendering

Check browser console for errors. Common issues:
- Invalid JSON syntax in `site.json`
- Missing required properties (see `schema.json`)
- Network errors loading CDN resources

### Icons not showing

Ensure Lucide CDN is loaded:
```html
<script src="https://unpkg.com/lucide@latest"></script>
```

### Markdown not parsing

Verify Marked.js CDN:
```html
<script src="https://cdn.jsdelivr.net/npm/marked/marked.min.js"></script>
```

### Routing not working

Make sure links have `data-route` attribute (handled automatically for internal links in JSON).

For custom HTML blocks:
```html
<a href="/page" data-route>Link</a>
```

## Contributing

Found a bug? Have a feature request?

1. Check existing issues
2. Create a new issue with details
3. Or submit a PR!

## License

[PolyForm Noncommercial 1.0.0](./LICENSE) — free for noncommercial use with attribution. For commercial use, please get in touch.

## Support

If DeclarativeWeb is useful to you, you can support its development:

☕ **[Buy me a coffee](https://buymeacoffee.com/Jamesstalleymoores)**

## Credits

Built with:
- [Pico CSS](https://picocss.com)
- [Marked.js](https://marked.js.org)
- [Lucide Icons](https://lucide.dev)

## Documentation

### 📚 Complete Guide

- **[PROJECT_OVERVIEW.md](./PROJECT_OVERVIEW.md)** - What is DeclarativeWeb? Vision, philosophy, and goals
- **[USER_GUIDE.md](./USER_GUIDE.md)** - Step-by-step tutorial for building sites
- **[DEVELOPER_GUIDE.md](./DEVELOPER_GUIDE.md)** - Architecture, implementation, and contribution guide
- **[BLOCKS.md](./BLOCKS.md)** - Complete reference for all 13 block types
- **[INJECTION.md](./INJECTION.md)** - Component injection API for dynamic widgets
- **[CLAUDE.md](./CLAUDE.md)** - Instructions for AI agents working with this codebase

### 🎯 Quick Links

**New to DeclarativeWeb?** Start with [USER_GUIDE.md](./USER_GUIDE.md)

**Want to understand the vision?** Read [PROJECT_OVERVIEW.md](./PROJECT_OVERVIEW.md)

**Building something specific?** Check [BLOCKS.md](./BLOCKS.md) for block reference

**Contributing or extending?** See [DEVELOPER_GUIDE.md](./DEVELOPER_GUIDE.md)

**Using with AI?** Reference [CLAUDE.md](./CLAUDE.md)

### 📦 Additional Resources

- [schema.json](./schema.json) - Full JSON schema for validation
- [examples/](./examples/) - Example sites (landing, docs, blog)
- [vibefeed/](./vibefeed/) - Complete social platform demo

---

**Made for humans, optimized for AI agents. Build static sites with just JSON.**
