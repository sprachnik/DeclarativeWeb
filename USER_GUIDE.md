# DeclarativeWeb User Guide

**A step-by-step guide to building websites with JSON**

## Who Is This Guide For?

This guide is for anyone who wants to build a website without dealing with complex frameworks, build tools, or even writing traditional code. If you can edit JSON and understand basic web concepts, you can build with DeclarativeWeb.

**You'll learn:**
- How to set up your first site in under 5 minutes
- How to add content using different block types
- How to create navigation and multiple pages
- How to make your site interactive with state and actions
- How to deploy your finished site

**You won't need:**
- Node.js, npm, or build tools
- React, Vue, or other frameworks
- HTML, CSS, or JavaScript knowledge (though it helps!)
- A local development server

---

## Table of Contents

1. [Quick Start](#quick-start)
2. [Understanding the Structure](#understanding-the-structure)
3. [Building Your First Page](#building-your-first-page)
4. [Adding More Pages](#adding-more-pages)
5. [Using Content Blocks](#using-content-blocks)
6. [Making It Interactive](#making-it-interactive)
7. [Customizing Appearance](#customizing-appearance)
8. [Advanced Features](#advanced-features)
9. [Deployment](#deployment)
10. [Troubleshooting](#troubleshooting)

---

## Quick Start

### Step 1: Download the Files

Download or clone the DeclarativeWeb repository:
```bash
git clone https://github.com/yourusername/RenderJS.git
cd RenderJS
```

You'll need three files:
- `index.html` - The HTML wrapper (rarely changed)
- `dist/declarativeweb.min.js` - The framework
- `dist/styles.css` - Base styling

### Step 2: Create Your First site.json

Create a file called `site.json` in the same directory as `index.html`:

```json
{
  "site": {
    "title": "My First Site",
    "description": "Built with DeclarativeWeb"
  },
  "pages": [
    {
      "path": "/",
      "title": "Home",
      "content": [
        {
          "type": "hero",
          "headline": "Hello World!",
          "subhead": "This is my first DeclarativeWeb site"
        }
      ]
    }
  ]
}
```

### Step 3: Open in Browser

Simply double-click `index.html` or open it in your browser. You should see your "Hello World!" site.

**That's it!** You've created your first DeclarativeWeb site.

---

## Understanding the Structure

Every `site.json` has two main parts:

### 1. Site Configuration

```json
{
  "site": {
    "title": "My Site",           // Shows in browser tab
    "description": "About my site", // For SEO/meta tags
    "logo": "/logo.png",           // Optional logo image
    "navLayout": "horizontal",     // or "vertical" or "both"
    "theme": {
      "primaryColor": "#0066cc",
      "fontFamily": "Inter, sans-serif"
    }
  }
}
```

### 2. Pages Array

```json
{
  "pages": [
    {
      "path": "/",              // URL path
      "title": "Home",          // Page title
      "content": [              // Array of blocks
        { "type": "hero", ... },
        { "type": "section", ... }
      ]
    },
    {
      "path": "/about",
      "title": "About Us",
      "content": [ ... ]
    }
  ]
}
```

Each page has:
- **path**: The URL route (e.g., "/" for homepage, "/about" for /about page)
- **title**: Shows in browser tab and navigation
- **content**: Array of content blocks (hero, section, markdown, etc.)

---

## Building Your First Page

Let's build a simple landing page with multiple sections.

### Add a Hero Section

The hero is your big, eye-catching header:

```json
{
  "type": "hero",
  "headline": "Welcome to My Amazing Product",
  "subhead": "The best solution for your needs",
  "cta": {
    "label": "Get Started",
    "path": "/signup"
  },
  "secondaryCta": {
    "label": "Learn More",
    "path": "/about"
  }
}
```

### Add Features Section

Show off your product features:

```json
{
  "type": "section",
  "title": "Features",
  "description": "Why customers love us",
  "columns": 3,
  "resources": [
    {
      "icon": "zap",
      "title": "Lightning Fast",
      "description": "Optimized for speed and performance"
    },
    {
      "icon": "shield",
      "title": "Secure",
      "description": "Bank-level security for your data"
    },
    {
      "icon": "users",
      "title": "Collaborative",
      "description": "Work together in real-time"
    }
  ]
}
```

### Add Markdown Content

For longer text content:

```json
{
  "type": "markdown",
  "content": "## About Us\n\nWe're a team of passionate developers building **amazing** products.\n\n- Founded in 2024\n- 1000+ happy customers\n- 99.9% uptime"
}
```

### Complete Example

```json
{
  "site": {
    "title": "Amazing Product"
  },
  "pages": [
    {
      "path": "/",
      "title": "Home",
      "content": [
        {
          "type": "hero",
          "headline": "Welcome to My Amazing Product",
          "subhead": "The best solution for your needs",
          "cta": { "label": "Get Started", "path": "/signup" }
        },
        {
          "type": "section",
          "title": "Features",
          "columns": 3,
          "resources": [
            {
              "icon": "zap",
              "title": "Lightning Fast",
              "description": "Optimized for speed"
            },
            {
              "icon": "shield",
              "title": "Secure",
              "description": "Bank-level security"
            },
            {
              "icon": "users",
              "title": "Collaborative",
              "description": "Real-time collaboration"
            }
          ]
        },
        {
          "type": "markdown",
          "content": "## About Us\n\nWe're building amazing products."
        }
      ]
    }
  ]
}
```

---

## Adding More Pages

### Create Multiple Pages

```json
{
  "pages": [
    {
      "path": "/",
      "title": "Home",
      "content": [ ... ]
    },
    {
      "path": "/about",
      "title": "About",
      "content": [
        {
          "type": "hero",
          "headline": "About Our Company"
        },
        {
          "type": "markdown",
          "content": "## Our Story\n\nWe started in 2024..."
        }
      ]
    },
    {
      "path": "/pricing",
      "title": "Pricing",
      "content": [ ... ]
    },
    {
      "path": "/contact",
      "title": "Contact",
      "content": [ ... ]
    }
  ]
}
```

### Navigation

Navigation is automatically created from your pages array. By default, it's a horizontal top bar. You can change this:

```json
{
  "site": {
    "navLayout": "vertical"  // Sidebar navigation
    // or "both"             // Sidebar + top action bar
    // or "horizontal"       // Default top bar
  }
}
```

To hide a page from navigation:

```json
{
  "path": "/hidden-page",
  "title": "Hidden Page",
  "showInNav": false,
  "content": [ ... ]
}
```

---

## Using Content Blocks

DeclarativeWeb provides 13 block types. Here are the most common ones:

### Hero Block
Big header with call-to-action buttons.

```json
{
  "type": "hero",
  "headline": "Your Main Message",
  "subhead": "Supporting text",
  "cta": { "label": "Click Me", "path": "/action" }
}
```

### Section Block
Grid of cards (features, team, products, etc.)

```json
{
  "type": "section",
  "title": "Our Team",
  "columns": 3,
  "resources": [
    {
      "title": "Jane Doe",
      "description": "CEO & Founder",
      "icon": "user"
    }
  ]
}
```

### Markdown Block
Rich text content with formatting.

```json
{
  "type": "markdown",
  "content": "# Heading\n\nParagraph with **bold** and *italic*.\n\n- List item 1\n- List item 2"
}
```

### Code Block
Syntax-highlighted code.

```json
{
  "type": "code",
  "language": "javascript",
  "code": "function hello() {\n  console.log('Hello!');\n}"
}
```

### Button Block
Interactive button with actions.

```json
{
  "type": "button",
  "label": "Click Me",
  "action": {
    "type": "navigate",
    "path": "/next-page"
  }
}
```

### Table Block
Display tabular data.

```json
{
  "type": "table",
  "headers": ["Name", "Age", "City"],
  "rows": [
    ["Alice", 28, "NYC"],
    ["Bob", 32, "SF"]
  ]
}
```

### HTML Block
Custom HTML when you need more control.

```json
{
  "type": "html",
  "content": "<div class='custom'><h2>Custom HTML</h2></div>"
}
```

### Mermaid Diagram
Flowcharts, sequence diagrams, and more.

```json
{
  "type": "mermaid",
  "diagram": "graph TD\n  A[Start] --> B[Process]\n  B --> C[End]"
}
```

### Frappe Chart
Data visualizations.

```json
{
  "type": "frappe-chart",
  "title": "Sales Over Time",
  "data": {
    "labels": ["Jan", "Feb", "Mar"],
    "datasets": [
      {
        "name": "Sales",
        "values": [100, 150, 200]
      }
    ]
  },
  "type": "line"
}
```

**See BLOCKS.md for complete reference with all options.**

---

## Making It Interactive

### Using State

State allows you to create interactive elements that respond to user actions.

#### 1. Initialize State

```json
{
  "type": "state",
  "name": "counter",
  "value": 0
}
```

#### 2. Display State

Use template syntax `{{state.name}}`:

```json
{
  "type": "html",
  "content": "<h2>Count: {{state.counter}}</h2>"
}
```

#### 3. Update State with Buttons

```json
{
  "type": "button",
  "label": "Increment",
  "action": {
    "type": "setState",
    "updates": {
      "counter": "{{state.counter + 1}}"
    }
  }
}
```

### Complete Interactive Example

A simple counter app:

```json
{
  "path": "/counter",
  "title": "Counter",
  "content": [
    {
      "type": "state",
      "name": "counter",
      "value": 0
    },
    {
      "type": "hero",
      "headline": "Count: {{state.counter}}",
      "subhead": "Click below to increment"
    },
    {
      "type": "button",
      "label": "Add One",
      "action": {
        "type": "setState",
        "updates": { "counter": "{{state.counter + 1}}" }
      }
    },
    {
      "type": "button",
      "label": "Reset",
      "action": {
        "type": "setState",
        "updates": { "counter": 0 }
      }
    }
  ]
}
```

### Quiz Example

Create interactive quizzes:

```json
{
  "type": "quiz",
  "title": "Quick Quiz",
  "questions": [
    {
      "question": "What is 2+2?",
      "options": ["3", "4", "5"],
      "correctAnswer": 1
    },
    {
      "question": "What color is the sky?",
      "options": ["Red", "Blue", "Green"],
      "correctAnswer": 1
    }
  ]
}
```

### Fetching Data

Load data from APIs:

```json
{
  "type": "button",
  "label": "Load Data",
  "action": {
    "type": "fetch",
    "url": "https://api.example.com/data",
    "saveAs": "apiData"
  }
}
```

Then display it:

```json
{
  "type": "html",
  "content": "<pre>{{state.apiData}}</pre>"
}
```

---

## Customizing Appearance

### Theme Configuration

Customize colors and fonts:

```json
{
  "site": {
    "theme": {
      "primaryColor": "#0066cc",
      "backgroundColor": "#ffffff",
      "textColor": "#333333",
      "fontFamily": "Inter, system-ui, sans-serif",
      "fontSize": "16px",
      "borderRadius": "0.5rem"
    }
  }
}
```

### Dark Mode

Built-in dark mode support:

```json
{
  "site": {
    "darkMode": true  // Enable dark mode toggle
  }
}
```

### Custom CSS

For advanced styling, edit `dist/styles.css` or add your own CSS file in `index.html`.

---

## Advanced Features

### Components (Reusable Blocks)

Define reusable HTML components:

```json
{
  "components": {
    "card": "<div class='card'><h3>{{title}}</h3><p>{{description}}</p></div>"
  },
  "pages": [
    {
      "path": "/",
      "content": [
        {
          "$ref": "card",
          "props": { "title": "Card 1", "description": "First card" }
        },
        {
          "$ref": "card",
          "props": { "title": "Card 2", "description": "Second card" }
        }
      ]
    }
  ]
}
```

### Functions

Define custom JavaScript functions:

```json
{
  "functions": {
    "formatDate": "return new Date().toLocaleDateString()",
    "double": "return args[0] * 2"
  },
  "pages": [
    {
      "path": "/",
      "content": [
        {
          "type": "html",
          "content": "Today is {{formatDate()}}"
        }
      ]
    }
  ]
}
```

### Conditional Rendering

Show/hide blocks based on conditions:

```json
{
  "type": "html",
  "if": "state.loggedIn === true",
  "content": "Welcome back!"
}
```

Or use if/then/else:

```json
{
  "if": "state.score >= 80",
  "then": [
    { "type": "html", "content": "✅ Passed!" }
  ],
  "else": [
    { "type": "html", "content": "❌ Failed" }
  ]
}
```

### Composable JSON (Splitting Files)

For large sites, split into multiple files:

**site.json:**
```json
{
  "pages": [
    { "path": "/", "$import": "pages/home.json" },
    { "path": "/about", "$import": "pages/about.json" }
  ]
}
```

**pages/home.json:**
```json
{
  "title": "Home",
  "content": [
    { "type": "hero", "headline": "Welcome!" }
  ]
}
```

This enables:
- Better organization
- Lazy loading (pages load only when visited)
- Easier collaboration

---

## Deployment

DeclarativeWeb sites are static files, so deployment is simple:

### Option 1: GitHub Pages

1. Push your code to GitHub
2. Go to Settings → Pages
3. Select branch and folder
4. Your site is live!

### Option 2: Netlify

1. Drag and drop your folder to netlify.com
2. Done!

### Option 3: Vercel

```bash
npm install -g vercel
vercel
```

### Option 4: Any Static Host

Upload these files to any web host:
- `index.html`
- `dist/` folder
- `site.json`
- Any assets (images, etc.)

**Important:** Make sure your server serves the correct MIME types:
- `.json` → `application/json`
- `.js` → `application/javascript`
- `.css` → `text/css`

---

## Troubleshooting

### Page Not Found

**Issue:** Navigating to a page shows "Page Not Found"

**Fix:** Make sure the page exists in your `pages` array with matching `path`.

```json
{
  "pages": [
    { "path": "/about", "title": "About", "content": [...] }
  ]
}
```

### Content Not Showing

**Issue:** Blocks don't appear on the page

**Fix:** Check the browser console (F12) for errors. Common issues:
- Invalid JSON syntax
- Missing required properties (e.g., `type`)
- Typos in property names

### State Not Updating

**Issue:** State changes don't trigger re-render

**Fix:** Make sure you're using setState action:

```json
{
  "type": "button",
  "action": {
    "type": "setState",
    "updates": { "count": "{{state.count + 1}}" }
  }
}
```

### Icons Not Showing

**Issue:** Icons appear as empty boxes

**Fix:** Check your internet connection. Icons load from Lucide CDN. For offline use, download Lucide and host locally.

### Validation Errors

Use a JSON validator like jsonlint.com to check syntax.

### Need Help?

1. Check the complete **BLOCKS.md** reference
2. Look at examples in `/examples/` folder
3. Open an issue on GitHub
4. Read the **DEVELOPER_GUIDE.md** for advanced topics

---

## Next Steps

Now that you understand the basics:

1. **Explore Examples**: Check `/examples/` for complete sites:
   - `example-landing.json` - Landing page
   - `example-docs.json` - Documentation site
   - `example-blog.json` - Blog

2. **Read BLOCKS.md**: Complete reference for all block types

3. **Try VibeFeed**: Check out `/vibefeed/` for a complete social platform built with DeclarativeWeb

4. **Build Something**: The best way to learn is by building!

---

## Tips & Best Practices

### Content Organization

- Keep related content in the same page
- Use sections to group similar resources
- Use markdown for long-form content
- Use HTML blocks sparingly (prefer semantic blocks)

### Performance

- Keep `site.json` under 500KB for fast load times
- Use `$import` for large sites
- Optimize images before uploading
- Use CDN for assets when possible

### SEO

- Set meaningful `title` and `description` in site config
- Use semantic headings (hero for H1, section titles for H2)
- Add `description` to pages for meta tags
- Consider static site generation for SEO-critical pages

### Accessibility

- Use descriptive button labels
- Provide alt text for images in markdown
- Use proper heading hierarchy
- Test keyboard navigation

### Maintenance

- Keep a backup of your `site.json`
- Test changes locally before deploying
- Use version control (git)
- Document any custom components or functions

---

**Happy building! 🚀**
