# DeclarativeWeb Project Overview

**Made for humans, optimized for AI agents.**

## What is DeclarativeWeb?

DeclarativeWeb (also known as RenderJS) is a minimal JavaScript library that renders complete websites from a single JSON schema. It's designed to make web development **declarative, accessible, and optimized for both human and AI collaboration**.

Think of it as a bridge between traditional web development and the AI-powered future:
- **For developers**: Build static sites 10x faster without touching HTML/CSS/JS
- **For AI agents**: A safe, structured format that prevents broken deployments
- **For everyone**: No build tools, no complex setup, just JSON and a browser

## The Vision

DeclarativeWeb started as a simple static site generator but is evolving into something more ambitious: **VibeFeed** - a social platform where users create and share interactive web experiences through natural language conversations with AI.

Imagine:
- Describe what you want in plain English
- AI generates interactive components in real-time
- Preview, refine, and publish instantly
- Others can discover, remix, and build upon your creations

**It's TikTok for web apps** - democratizing web development through AI-powered creativity.

## Why DeclarativeWeb Exists

### The Problem
Modern web development has become unnecessarily complex:
- Build tools (webpack, vite, rollup)
- Framework lock-in (React, Vue, Svelte)
- Compilation steps and deployment pipelines
- Hours of setup before writing a single line of content

For AI agents, this complexity creates additional challenges:
- Unsafe code generation (XSS, injection attacks)
- Breaking changes that crash entire applications
- Difficulty validating generated code
- Complex debugging when things go wrong

### The Solution
DeclarativeWeb offers a radically simpler approach:

```json
{
  "site": { "title": "My Site" },
  "pages": [{
    "path": "/",
    "content": [{
      "type": "hero",
      "headline": "Welcome!",
      "subhead": "Edit this JSON to change your site"
    }]
  }]
}
```

That's it. No build step, no framework, no complexity.

**For Humans:**
- Edit JSON in any text editor
- Refresh browser to see changes
- Error messages that actually help
- Zero configuration required

**For AI:**
- Structured schema with clear validation
- Safe expression evaluation (no eval/Function)
- Sandboxed execution environment
- Streaming support for real-time generation

## Core Philosophy

### 1. Single-File Editing
Update only `site.json` - never touch HTML, CSS, or JavaScript framework files. This keeps your content separate from the presentation layer and makes AI editing safer.

### 2. Zero Build Step
Works directly in browsers. No npm, webpack, or build tools required. For local development, just open `index.html`. For production, upload to any static host.

### 3. LLM-Optimized
Every decision is made with AI agents in mind:
- Declarative JSON instead of imperative code
- Safe expression parser (no arbitrary JavaScript)
- Comprehensive error handling
- Real-time streaming support

### 4. Graceful Failures
One broken component doesn't crash the entire page. Errors are isolated, displayed clearly, and provide actionable recovery options.

## What Can You Build?

DeclarativeWeb provides 13 content block types for any use case:

### Content & Layout
- **Hero** - Eye-catching headers with CTAs
- **Section** - Resource grids with icons, tags, and links
- **Markdown** - Full GitHub-flavored markdown
- **HTML** - Custom HTML with template interpolation

### Data & Interactivity
- **Table** - Tabular data (CSV, JSON, or objects)
- **Button** - Interactive actions (navigate, setState, fetch)
- **Form** - Auto-generated forms with validation
- **Quiz** - Interactive quizzes with scoring

### Visualization
- **Code** - Syntax-highlighted code blocks
- **Mermaid** - Diagrams (flowcharts, sequence, ERD, Gantt)
- **Frappe Chart** - Data viz (line, bar, pie, heatmap)
- **P5.js** - Creative coding sketches (sandboxed)

### Advanced
- **State** - Reactive state management
- **Watch** - Conditional action execution

## Real-World Examples

### Documentation Sites
Vertical sidebar navigation, markdown content, code examples, API references.
```bash
cp examples/example-docs.json site.json
```

### Landing Pages
Hero sections, feature grids, pricing tables, testimonials.
```bash
cp examples/example-landing.json site.json
```

### Blogs
Article cards, categories, full markdown pages, author bios.
```bash
cp examples/example-blog.json site.json
```

### Interactive Applications
The default `site.json` is a complete EdTech platform with:
- Course catalog (8+ courses with details)
- Features showcase
- Pricing tiers
- About page with team and metrics

### VibeFeed Platform
A complete social platform in `/vibefeed/` demonstrating the full vision:
- AI-powered creation interface
- Social feed with likes, comments, follows
- Remixing and attribution
- Embeddable shareable components
- Freemium tier system

## How It Works (In 60 Seconds)

**1. Set up the HTML** (one-time setup)
```html
<!DOCTYPE html>
<html>
<head>
  <link rel="stylesheet" href="dist/styles.css">
</head>
<body>
  <div id="app"></div>
  <script src="dist/declarativeweb.min.js"></script>
  <script>
    Render.init({ src: 'site.json', target: '#app' })
  </script>
</body>
</html>
```

**2. Create your content** (site.json)
```json
{
  "site": {
    "title": "My Awesome Site",
    "description": "Built with DeclarativeWeb"
  },
  "pages": [
    {
      "path": "/",
      "title": "Home",
      "content": [
        {
          "type": "hero",
          "headline": "Build websites with JSON",
          "subhead": "No build tools required"
        }
      ]
    }
  ]
}
```

**3. Open in browser**
No server needed for local development. Just double-click `index.html`.

**4. Deploy**
Upload to any static host:
- GitHub Pages
- Netlify
- Vercel
- Cloudflare Pages
- AWS S3

## Key Features

### Component Injection System
Inject components anywhere without routing:
```javascript
Render.inject('#widget', {
  type: 'html',
  content: '<p>Count: {{state.count}}</p>'
}, { reactive: true })
```

### Streaming from AI
Real-time progressive rendering as AI generates JSON:
```javascript
const stream = Render.createStream('#output')
stream.append('{"type": "hero", ')
stream.append('"headline": "AI Generated"}')
stream.complete()
```

### Reactive State Management
Automatic re-rendering when state changes:
```javascript
Render.state.count = 42  // Triggers re-render
```

### Template Interpolation
Mustache-style templating with expressions:
```
{{site.title}}                    - Property access
{{state.count + 1}}              - Arithmetic
{{state.score >= 3 ? 'Pass' : 'Fail'}}  - Conditionals
{{formatNumber(state.total)}}    - Function calls
```

### Composable JSON
Split large files with lazy loading:
```json
{
  "pages": [
    { "path": "/", "$import": "pages/home.json" },
    { "path": "/about", "$import": "pages/about.json" }
  ]
}
```

### Security
- Custom expression parser (no eval/Function)
- Sandboxed P5.js in iframes
- Safe declarative actions only
- XSS prevention through sanitization

## Technology Stack

**Zero Production Dependencies**
- Pure JavaScript (ES6+ with Proxy support)
- Bundle size: ~77KB minified

**CDN-Loaded Libraries** (not bundled)
- Pico CSS 2 - Minimal CSS framework
- Marked.js - Markdown parser
- Lucide Icons - Icon library
- Mermaid v10 - Diagram rendering
- Frappe Charts - Data visualization
- P5.js - Creative coding (sandboxed)

**Dev Dependencies**
- esbuild - Fast bundling
- Jest - Testing framework
- Playwright - E2E testing

## Architecture Highlights

### Modular Design
~5,277 lines of JavaScript across 9 core modules:
- `render.js` - Core framework (2,000+ lines)
- `expression-evaluator.js` - Safe parser
- `state-manager.js` - Reactive proxy
- `streaming-json-parser.js` - LLM streaming
- `action-executor.js` - Action handling
- `data-fetcher.js` - API calls
- `form-gen.js` - Form generation
- `conditional-renderer.js` - if/then/else
- `loop-renderer.js` - Iteration
- `watch-manager.js` - State subscriptions

### Performance
- Initial load: ~200ms (CDN cached)
- Route changes: <10ms (client-side)
- Lighthouse score: 95+ out of the box
- Total framework: ~81KB (JS + CSS + schema)

### Browser Support
- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- Requires ES6 Proxy (no IE11)

## When to Use DeclarativeWeb

### Perfect For:
✅ Documentation sites
✅ Landing pages
✅ Portfolios
✅ Blogs
✅ Prototypes
✅ Educational platforms
✅ Internal tools
✅ LLM-generated interfaces
✅ AI chat applications with rich components

### Not Ideal For:
❌ Large e-commerce sites requiring SSR
❌ Applications needing server-side rendering
❌ SEO-critical pages (limited to meta tags)
❌ Real-time collaborative editing
❌ Complex SPA state management

## Getting Started

### Quick Start
```bash
# Clone the repository
git clone https://github.com/yourusername/RenderJS.git
cd RenderJS

# Try an example
cp examples/example-landing.json site.json

# Open in browser
open index.html
```

### Development
```bash
npm install           # Install dependencies
npm run build         # Bundle JS
npm test              # Run tests
npm run test:watch    # Watch mode
```

### Documentation
- **USER_GUIDE.md** - How to build sites with DeclarativeWeb
- **DEVELOPER_GUIDE.md** - Architecture and contribution guide
- **BLOCKS.md** - Complete block reference
- **INJECTION.md** - Component injection API
- **CLAUDE.md** - Instructions for AI agents

## Project Status

**Current Version**: ~1.0
**Status**: Production-ready for static sites

**Recent Additions**:
- Component injection system
- Streaming JSON parser
- Composable JSON with $import
- P5.js creative coding blocks
- Form generation system
- Watch blocks for reactive actions
- VibeFeed social platform demo

**Test Coverage**: 70%+ (lines/functions/statements)

## Contributing

DeclarativeWeb is designed to be:
- **Simple to understand** - Clear, readable code
- **Easy to extend** - Modular architecture
- **Safe to modify** - Comprehensive tests
- **Fun to build with** - Instant feedback loop

See **DEVELOPER_GUIDE.md** for contribution guidelines.

## The Future

DeclarativeWeb is evolving from a framework into a **platform**:

1. **Short-term**: Enhance VibeFeed social features
2. **Medium-term**: Component marketplace and templates
3. **Long-term**: Visual editor with AI assistance

The goal: Make web development accessible to everyone through the combination of declarative JSON and AI collaboration.

## License

[Check LICENSE file in repository]

## Links

- **Repository**: [GitHub URL]
- **Demo**: [Live demo URL]
- **VibeFeed**: [VibeFeed platform URL]
- **Documentation**: See USER_GUIDE.md and DEVELOPER_GUIDE.md

---

**Made with ❤️ for the AI-powered web**
