# DeclarativeWeb Quickstart

Get a website running in 60 seconds. No build tools, no dependencies to install.

## 1. Create These Files

### `index.html`

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

  <!-- Dependencies -->
  <script src="https://cdn.jsdelivr.net/npm/marked/marked.min.js"></script>
  <script src="https://unpkg.com/lucide@latest"></script>

  <!-- DeclarativeWeb Bundle -->
  <script src="dist/declarativeweb.min.js"></script>

  <script>
    Render.init({ src: 'site.json', target: '#app' })
  </script>
</body>
</html>
```

### Required Files

Download these from the [DeclarativeWeb repo](https://github.com/sprachnik/DeclarativeWeb):

```
index.html              (create from template above)
site.json               (create from template below)
styles.css
dist/declarativeweb.min.js
```

### `site.json`

```json
{
  "site": {
    "title": "My Site",
    "defaultTheme": "light"
  },
  "nav": {
    "logo": { "text": "My Site", "icon": "zap" },
    "links": [
      { "label": "Home", "path": "/" },
      { "label": "About", "path": "/about" }
    ],
    "actions": [{ "type": "theme-toggle" }]
  },
  "footer": {
    "text": "Built with DeclarativeWeb"
  },
  "pages": [
    {
      "path": "/",
      "content": [
        {
          "type": "hero",
          "headline": "Welcome to My Site",
          "subhead": "Edit site.json to change this content.",
          "cta": { "label": "Learn More", "path": "/about" }
        },
        {
          "type": "section",
          "title": "Features",
          "columns": 3,
          "resources": [
            { "title": "Fast", "description": "No build step required", "icon": "zap" },
            { "title": "Simple", "description": "Just edit JSON", "icon": "file-text" },
            { "title": "Flexible", "description": "Multiple block types", "icon": "layers" }
          ]
        }
      ]
    },
    {
      "path": "/about",
      "content": [
        {
          "type": "markdown",
          "content": "# About\n\nThis site is built with **DeclarativeWeb** - a minimal framework for rendering websites from JSON.\n\n## How it works\n\n1. Edit `site.json` to change content\n2. Refresh browser to see changes\n3. That's it!"
        }
      ]
    }
  ]
}
```

## 2. Run It

**Option A: Open directly**
```
Just double-click index.html
```

**Option B: Local server (if you have Node.js)**
```bash
npx serve .
```

**Option C: Python server**
```bash
python -m http.server 8000
```

Then open `http://localhost:8000`

## 3. Customize

Edit `site.json` to:
- Change text in `headline`, `subhead`, `description`
- Add pages to the `pages` array
- Add nav links to `nav.links`
- Change icons (browse [Lucide icons](https://lucide.dev/icons))

## Block Types

| Type | Purpose |
|------|---------|
| `hero` | Large header with CTA buttons |
| `section` | Grid of cards |
| `markdown` | Markdown content |
| `html` | Raw HTML |
| `code` | Code snippets |
| `mermaid` | Diagrams |
| `frappe-chart` | Charts |

## Next Steps

- See [BLOCKS.md](./BLOCKS.md) for all block options
- See [README.md](./README.md) for full documentation
- Check [examples/](./examples/) for more templates
