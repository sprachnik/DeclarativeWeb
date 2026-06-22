# DeclarativeWeb Block Reference

Complete guide to all content block types available in render.js. Use these blocks in the `content` array of any page in your `site.json`.

---

## Table of Contents

1. [Hero Block](#hero-block)
2. [Section Block](#section-block)
3. [Markdown Block](#markdown-block)
4. [Code Block](#code-block)
5. [Button Block](#button-block) ⭐ Updated with Safe Actions
6. [State Block](#state-block)
7. [Conditional Rendering](#conditional-rendering)
8. [Table Block](#table-block)
9. [HTML Block](#html-block)
10. [Mermaid Diagram Block](#mermaid-diagram-block)
11. [Frappe Chart Block](#frappe-chart-block)
12. [P5.js Block](#p5js-block) ⭐ New - Creative Coding
13. [Quiz Block](#quiz-block) ⭐ New - Interactive Quizzes
14. [Component Reference](#component-reference)
15. [Templating Syntax](#templating-syntax)

---

## Hero Block

Large, centered header section with headline, subhead, and call-to-action buttons.

### Properties

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `type` | `"hero"` | Yes | Block type identifier |
| `headline` | string | Yes | Main heading text |
| `subhead` | string | No | Subtitle text below headline |
| `cta` | object | No | Primary call-to-action button |
| `secondaryCta` | object | No | Secondary call-to-action button |

### CTA Object

| Property | Type | Description |
|----------|------|-------------|
| `label` | string | Button text |
| `path` | string | Internal route path (for SPA navigation) |
| `url` | string | External URL (opens in new tab) |
| `icon` | string | Lucide icon name |

### Example

```json
{
  "type": "hero",
  "headline": "Welcome to LearnHub",
  "subhead": "Empowering students with interactive learning experiences",
  "cta": {
    "label": "Start Learning",
    "path": "/courses"
  },
  "secondaryCta": {
    "label": "View Demo",
    "url": "https://demo.learnhub.com",
    "icon": "play-circle"
  }
}
```

---

## Section Block

Grid of resource cards with optional icons, links, and tags. Perfect for features, courses, team members, etc.

### Properties

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `type` | `"section"` | Yes | Block type identifier |
| `id` | string | No | HTML id attribute for anchor links |
| `title` | string | No | Section heading |
| `description` | string | No | Section description |
| `columns` | number \| object | No | Column layout (default: 3) |
| `gridTemplate` | string | No | Custom CSS grid template |
| `resources` | array | No | Array of resource card objects |

### Column Configuration

**Simple (number):**
```json
"columns": 3
```

**Responsive (object):**
```json
"columns": {
  "mobile": 1,
  "tablet": 2,
  "desktop": 4
}
```

**Custom grid template:**
```json
"gridTemplate": "repeat(auto-fit, minmax(250px, 1fr))"
```

### Resource Object

| Property | Type | Description |
|----------|------|-------------|
| `title` | string | Card title (required) |
| `description` | string | Card description (required) |
| `icon` | string | Lucide icon name |
| `url` | string | Link URL (internal or external) |
| `tags` | array | Array of tag strings |

### Example

```json
{
  "type": "section",
  "id": "features",
  "title": "Platform Features",
  "description": "Everything you need to succeed in online learning",
  "columns": 3,
  "resources": [
    {
      "title": "Interactive Lessons",
      "description": "Engage with multimedia content and real-time quizzes",
      "icon": "book-open",
      "url": "/features/lessons",
      "tags": ["video", "quizzes"]
    },
    {
      "title": "Progress Tracking",
      "description": "Monitor your learning journey with detailed analytics",
      "icon": "trending-up",
      "tags": ["analytics"]
    },
    {
      "title": "Live Sessions",
      "description": "Join virtual classrooms with expert instructors",
      "icon": "video",
      "url": "/features/live",
      "tags": ["live", "instructors"]
    }
  ]
}
```

---

## Markdown Block

Render markdown content with full GitHub-flavored markdown support via marked.js.

### Properties

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `type` | `"markdown"` | Yes | Block type identifier |
| `content` | string | Yes | Markdown content |

### Example

```json
{
  "type": "markdown",
  "content": "## Getting Started\n\nWelcome to our **learning platform**. Here's what you can do:\n\n- Browse courses\n- Track progress\n- Earn certificates\n\nReady to begin? [Start here](/courses)"
}
```

### Supported Markdown

- Headings (`#`, `##`, `###`, etc.)
- **Bold**, *italic*, ~~strikethrough~~
- Lists (ordered and unordered)
- Links and images
- Code blocks with syntax highlighting
- Blockquotes
- Tables
- Horizontal rules

---

## Code Block

Syntax-highlighted code snippets with optional title and description.

### Properties

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `type` | `"code"` | Yes | Block type identifier |
| `code` | string | Yes | Source code content |
| `language` | string | No | Language for syntax highlighting (default: "text") |
| `title` | string | No | Code block title |
| `description` | string | No | Description shown above code |

### Example

```json
{
  "type": "code",
  "title": "API Quick Start",
  "language": "javascript",
  "description": "Initialize the SDK and fetch your first course",
  "code": "import { LearnHub } from '@learnhub/sdk';\n\nconst client = new LearnHub({\n  apiKey: process.env.API_KEY\n});\n\nconst courses = await client.courses.list();\nconsole.log(courses);"
}
```

### Supported Languages

Common: `javascript`, `typescript`, `python`, `java`, `html`, `css`, `json`, `bash`, `sql`, `markdown`

Full list: Any language supported by your syntax highlighter (default: plain text formatting)

---

## Button Block

Declarative button with action binding. Supports both function calls and safe declarative actions.

### Properties

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `type` | `"button"` | Yes | Block type identifier |
| `label` | string | Yes | Button text |
| `variant` | string | No | Style variant: `secondary`, `contrast`, `outline` |
| `action` | string/object | No | Action to perform on click |
| `icon` | string | No | Lucide icon name |
| `disabled` | boolean/string | No | Disabled state or expression |

### Action Formats

**1. Safe Declarative Actions** (recommended for security):

```json
{
  "type": "button",
  "label": "Increment Counter",
  "action": {
    "type": "setState",
    "updates": { "counter": "{{state.counter + 1}}" }
  }
}
```

**Safe Action Types:**
- `setState` - Update state values
- `navigate` - Navigate to a route
- `toggleState` - Toggle boolean state
- `resetState` - Reset state to initial values

**2. Function Call** (requires function definition):
```json
{
  "type": "button",
  "label": "Submit Answer",
  "variant": "contrast",
  "action": {"fn": "checkAnswer", "args": [0]}
}
```

**3. String Expression**:
```json
{
  "type": "button",
  "label": "Increment",
  "action": "Render.state.counter++"
}
```

### Safe Action Examples

**setState - Update multiple values:**
```json
{
  "type": "button",
  "label": "Start Game",
  "variant": "contrast",
  "action": {
    "type": "setState",
    "updates": {
      "gameStarted": true,
      "score": 0,
      "level": 1
    }
  }
}
```

**toggleState - Toggle boolean:**
```json
{
  "type": "button",
  "label": "Toggle Theme",
  "icon": "sun",
  "action": {
    "type": "toggleState",
    "key": "darkMode"
  }
}
```

**navigate - Go to route:**
```json
{
  "type": "button",
  "label": "View Results",
  "icon": "arrow-right",
  "action": {
    "type": "navigate",
    "path": "/results"
  }
}
```

**resetState - Clear state:**
```json
{
  "type": "button",
  "label": "Reset Quiz",
  "icon": "refresh-cw",
  "variant": "secondary",
  "action": {
    "type": "resetState",
    "keys": ["score", "answers", "currentQuestion"]
  }
}
```

### With Icon

```json
{
  "type": "button",
  "label": "Add Item",
  "icon": "plus",
  "variant": "outline",
  "action": {
    "type": "setState",
    "updates": { "items": "{{[...state.items, 'New Item']}}" }
  }
}
```

### Conditional Disabled State

```json
{
  "type": "button",
  "label": "Submit",
  "variant": "contrast",
  "action": {"fn": "submit"},
  "disabled": "state.isSubmitting || !state.isValid"
}
```

---

## State Block

Initialize reactive state variables with proper types. Use this as the **first block** in interactive content to set up state before conditionals and loops access it.

### Properties

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `type` | `"state"` | Yes | Block type identifier |
| `init` | object | Yes | Key-value pairs of state variables to initialize |

### Example

```json
{
  "type": "state",
  "init": {
    "step": 0,
    "score": 0,
    "playerName": "",
    "answers": [],
    "questions": [
      { "q": "What is 2+2?", "opts": ["3", "4", "5"], "answer": 1 }
    ]
  }
}
```

### Behavior

- **Preserves types**: Numbers, strings, arrays, objects, null, and booleans are all preserved
- **Non-destructive**: Only sets values if not already defined (won't overwrite existing state)
- **Invisible**: Renders as empty string (no visual output)
- **Order matters**: Place as the first block so state is available for subsequent conditionals and loops

### Use with Conditionals and Loops

```json
[
  {
    "type": "state",
    "init": { "step": 0, "items": ["Apple", "Banana", "Cherry"] }
  },
  {
    "if": "state.step === 0",
    "then": { "type": "markdown", "content": "## Step 1" }
  },
  {
    "each": "state.items",
    "as": "item",
    "template": { "type": "markdown", "content": "- {{item}}" }
  }
]
```

### Comparison with site.state

| Feature | `site.state` (in site.json) | `state` block (in content) |
|---------|----------------------------|---------------------------|
| When initialized | App load | When block renders |
| Scope | Global, all pages | Per-page/per-content |
| Use case | App-wide defaults | Dynamic/interactive content |

---

## Watch Block

Execute actions when a condition becomes true. Perfect for callbacks, API calls on completion, or triggering side effects.

### Properties

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `type` | `"watch"` | Yes | Block type identifier |
| `if` | string | Yes | Condition expression to evaluate |
| `actions` | array | Yes | Array of actions to execute when condition is true |
| `once` | boolean | No | If true, only fires the first time condition becomes true (default: false) |
| `id` | string | No | Unique identifier (auto-generated if not provided) |

### Action Types

| Action Type | Description | Required Properties |
|-------------|-------------|---------------------|
| `fetch` | Make HTTP request | `url`, optionally `method`, `headers`, `body`, `saveAs` |
| `setState` | Update state values | `updates` (object) |
| `navigate` | Navigate to route | `path` |
| `resetState` | Reset state | `keys` (optional array) |

### Basic Example

```json
{
  "type": "watch",
  "if": "state.quizComplete",
  "once": true,
  "actions": [
    { "type": "setState", "updates": { "submitted": true } }
  ]
}
```

### API Call on Completion

```json
{
  "type": "watch",
  "if": "state.step >= state.totalQuestions",
  "once": true,
  "actions": [
    {
      "type": "fetch",
      "url": "/api/quiz/submit",
      "method": "POST",
      "headers": { "Authorization": "Bearer {{state.authToken}}" },
      "body": { "score": "{{state.score}}", "answers": "{{state.answers}}" },
      "saveAs": "submitResult"
    },
    { "type": "setState", "updates": { "submitted": true } }
  ]
}
```

### Multiple Actions with Interpolation

```json
{
  "type": "watch",
  "if": "state.score >= 3",
  "once": true,
  "actions": [
    {
      "type": "fetch",
      "url": "/api/achievements/unlock",
      "method": "POST",
      "body": { "achievement": "high-scorer", "userId": "{{state.userId}}" }
    },
    { "type": "setState", "updates": { "achievementUnlocked": true } },
    { "type": "navigate", "path": "/results" }
  ]
}
```

### Behavior

- **Invisible**: Renders as empty string (no visual output)
- **Async execution**: Actions execute asynchronously without blocking render
- **Interpolation**: Action parameters support `{{expression}}` syntax
- **Once mode**: With `once: true`, actions fire only the first time the condition becomes true
- **Re-evaluation**: Without `once`, actions fire on every render where condition is true

### Quiz Completion Pattern

```json
[
  {
    "type": "state",
    "init": { "step": 0, "score": 0, "totalQ": 3, "submitted": false }
  },
  {
    "type": "watch",
    "if": "state.step >= state.totalQ && !state.submitted",
    "once": true,
    "actions": [
      {
        "type": "fetch",
        "url": "/api/submit",
        "method": "POST",
        "body": { "score": "{{state.score}}" },
        "saveAs": "result"
      },
      { "type": "setState", "updates": { "submitted": true } }
    ]
  },
  {
    "type": "hero",
    "headline": "Quiz Complete!",
    "subhead": "Score: {{state.score}}/{{state.totalQ}}",
    "if": "state.step >= state.totalQ"
  }
]
```

---

## Conditional Rendering

Show or hide blocks based on state conditions.

### Inline `if` (Recommended - Simplest)

Add an `if` property to any block to conditionally render it:

```json
{
  "type": "markdown",
  "content": "## Welcome back!",
  "if": "state.loggedIn"
}
```

```json
{
  "type": "button",
  "label": "Next Question",
  "action": "Render.state.step++",
  "if": "state.step < state.questions.length"
}
```

The block only renders when the condition is truthy. No `then`/`else` needed.

### `if`/`then`/`else` (For Branching)

When you need to show different content based on a condition:

```json
{
  "if": "state.step === 0",
  "then": { "type": "markdown", "content": "## Step 1: Introduction" },
  "else": { "type": "markdown", "content": "## Step {{state.step + 1}}" }
}
```

Nested conditions for multiple branches:
```json
{
  "if": "state.score >= 3",
  "then": { "type": "hero", "headline": "You Won!" },
  "else": {
    "if": "state.gameOver",
    "then": { "type": "hero", "headline": "Game Over" },
    "else": { "type": "markdown", "content": "Keep playing..." }
  }
}
```

### Supported Expressions

- Comparisons: `state.count > 5`, `state.step === 0`, `state.name !== ""`
- Boolean logic: `state.a && state.b`, `state.x || state.y`, `!state.done`
- Arithmetic: `state.score >= state.questions.length * 0.6`
- Property access: `state.user.name`, `state.items.length`, `state.questions[state.step].q`

---

## Table Block

Display tabular data using Pico CSS tables. Accepts CSV string or JSON array formats.

### Properties

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `type` | `"table"` | Yes | Block type identifier |
| `data` | string/array | Yes | CSV string or JSON array |
| `caption` | string | No | Table caption/title |
| `striped` | boolean | No | Alternating row colors |

### Data Formats

**CSV String** (first row is header):
```json
{
  "type": "table",
  "caption": "Team Members",
  "striped": true,
  "data": "Name,Role,Email\nAlice,Engineer,alice@example.com\nBob,Designer,bob@example.com\nCarol,Manager,carol@example.com"
}
```

**JSON Array of Arrays** (first array is header):
```json
{
  "type": "table",
  "data": [
    ["Product", "Price", "Stock"],
    ["Widget A", "$10", 50],
    ["Widget B", "$15", 30],
    ["Widget C", "$20", 25]
  ]
}
```

**JSON Array of Objects** (keys become headers):
```json
{
  "type": "table",
  "caption": "Sales Report",
  "data": [
    {"month": "January", "sales": 1200, "growth": "12%"},
    {"month": "February", "sales": 1350, "growth": "8%"},
    {"month": "March", "sales": 1500, "growth": "11%"}
  ]
}
```

### With Interpolation

Table cells support template expressions:
```json
{
  "type": "table",
  "data": [
    ["Item", "Quantity", "Total"],
    ["{{state.item}}", "{{state.qty}}", "{{state.qty * state.price}}"]
  ]
}
```

### CSV with Quoted Values

Handles quoted CSV values containing commas:
```json
{
  "type": "table",
  "data": "Name,Description,Price\n\"Widget, Standard\",\"A basic widget\",\"$10\"\n\"Widget, Premium\",\"An advanced widget\",\"$25\""
}
```

---

## HTML Block

Raw HTML content with template interpolation support.

### Properties

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `type` | `"html"` | Yes | Block type identifier |
| `html` | string | Yes | HTML content |

### Example

```json
{
  "type": "html",
  "html": "<div class=\"grid\"><div class=\"card\"><h3>Custom Layout</h3><p>Use HTML for complete control over structure and styling.</p></div><div class=\"card\"><h3>Flexible</h3><p>Combine with Pico CSS classes for rapid prototyping.</p></div></div>"
}
```

### With Interpolation

```json
{
  "type": "html",
  "html": "<div class=\"alert\"><strong>{{site.title}}</strong> - Version {{state.version}}</div>"
}
```

---

## Mermaid Diagram Block

Renders diagrams from Mermaid DSL (Domain Specific Language). Perfect for flowcharts, sequence diagrams, entity relationship diagrams, state machines, and Gantt charts.

### Properties

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `type` | `"mermaid"` | Yes | Block type identifier |
| `content` | string | Yes | Mermaid DSL content |
| `theme` | string | No | Diagram theme: `default`, `dark`, `neutral`, `forest` (default: `neutral`) |

### Example: Flowchart

```json
{
  "type": "mermaid",
  "content": "graph TD\n  A[Start] --> B{Decision}\n  B -->|Yes| C[Process]\n  B -->|No| D[End]\n  C --> D",
  "theme": "neutral"
}
```

### Example: Sequence Diagram

```json
{
  "type": "mermaid",
  "content": "sequenceDiagram\n  User->>API: Request\n  API->>Database: Query\n  Database-->>API: Results\n  API-->>User: Response"
}
```

### Example: Entity Relationship Diagram

```json
{
  "type": "mermaid",
  "content": "erDiagram\n  USER ||--o{ ORDER : places\n  ORDER ||--|{ ITEM : contains\n  USER {\n    string id\n    string name\n  }\n  ORDER {\n    string id\n    date created\n  }"
}
```

### Supported Diagram Types

- `graph TD` / `graph LR` - Flowcharts (vertical/horizontal)
- `sequenceDiagram` - Sequence diagrams
- `erDiagram` - Entity relationship diagrams
- `stateDiagram-v2` - State machines
- `gantt` - Gantt charts
- `classDiagram` - Class diagrams

### Tips

- Keep node labels short (2-4 words max)
- Use `graph TD` for hierarchies, `graph LR` for processes
- Escape special characters in labels with quotes: `A["User Input"]`
- Test complex diagrams at [mermaid.live](https://mermaid.live)

---

## Frappe Chart Block

Renders clean, minimal charts for data visualization using Frappe Charts library. Automatically themed to match Pico CSS.

### Properties

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `type` | `"frappe-chart"` | Yes | Block type identifier |
| `chartType` | string | Yes | Chart type: `line`, `bar`, `pie`, `percentage`, `heatmap` |
| `labels` | array | Yes | X-axis labels (strings, max 20 chars each) |
| `datasets` | array | Yes | Array of dataset objects (max 6 for visual clarity) |
| `title` | string | No | Chart title (max 60 chars) |
| `colors` | array | No | Hex color codes (defaults to Pico CSS theme colors) |
| `height` | number | No | Chart height in pixels (150-600, default: 300) |

### Dataset Object

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `name` | string | No | Dataset name (max 30 chars) |
| `values` | array | Yes | Numeric data values (must match labels length) |

### Example: Bar Chart

```json
{
  "type": "frappe-chart",
  "chartType": "bar",
  "title": "Quarterly Revenue 2024",
  "labels": ["Q1", "Q2", "Q3", "Q4"],
  "datasets": [
    {
      "name": "Revenue",
      "values": [120000, 180000, 140000, 220000]
    }
  ]
}
```

### Example: Multi-Line Chart

```json
{
  "type": "frappe-chart",
  "chartType": "line",
  "title": "User Growth",
  "labels": ["Jan", "Feb", "Mar", "Apr", "May", "Jun"],
  "datasets": [
    {
      "name": "Active Users",
      "values": [850, 920, 1050, 1200, 1350, 1500]
    },
    {
      "name": "New Signups",
      "values": [120, 145, 180, 210, 195, 225]
    }
  ],
  "height": 350
}
```

### Example: Pie Chart

```json
{
  "type": "frappe-chart",
  "chartType": "pie",
  "title": "Traffic Sources",
  "labels": ["Organic", "Social", "Direct", "Referral"],
  "datasets": [
    {
      "values": [45, 25, 20, 10]
    }
  ]
}
```

### Chart Type Guidelines

- **Line**: Trends over time, continuous data
- **Bar**: Comparisons between categories
- **Pie**: Proportions of a whole (max 6 segments)
- **Percentage**: Stacked proportions showing 100% total
- **Heatmap**: Matrix data with intensity values

### Tips

- Keep labels short to avoid overlap
- Limit to 6 datasets maximum for readability
- Use consistent color schemes across charts
- Omit optional `colors` to use Pico CSS theme colors automatically
- Values array length must exactly match labels array length

### With Template Interpolation

```json
{
  "type": "frappe-chart",
  "chartType": "bar",
  "title": "{{site.title}} - Performance",
  "labels": ["Week 1", "Week 2", "Week 3", "Week 4"],
  "datasets": [
    {
      "name": "Completions",
      "values": "{{state.weeklyData}}"
    }
  ]
}
```

---

## P5.js Block

Interactive creative coding sketches using P5.js library in a sandboxed iframe. Perfect for generative art, animations, and interactive visualizations.

### Properties

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `type` | `"p5js"` | Yes | Block type identifier |
| `code` | string | Yes | P5.js sketch code (setup and draw functions) |
| `width` | number | No | Canvas width in pixels (default: 400) |
| `height` | number | No | Canvas height in pixels (default: 400) |

### Example: Simple Animation

```json
{
  "type": "p5js",
  "code": "function setup() { createCanvas(400, 400); } function draw() { background(220); ellipse(mouseX, mouseY, 50, 50); }",
  "width": 400,
  "height": 400
}
```

### Example: Generative Art

```json
{
  "type": "p5js",
  "width": 600,
  "height": 400,
  "code": "let x = 0; function setup() { createCanvas(600, 400); background(0); stroke(255); strokeWeight(2); } function draw() { let y = height/2 + sin(x * 0.05) * 100; point(x, y); x++; if (x > width) { x = 0; background(0); } }"
}
```

### Example: Interactive Sketch

```json
{
  "type": "p5js",
  "code": "function setup() { createCanvas(400, 400); } function draw() { if (mouseIsPressed) { fill(0); } else { fill(255); } ellipse(mouseX, mouseY, 80, 80); }"
}
```

### Security Notes

- P5.js blocks run in a sandboxed iframe with `allow-scripts` only
- No access to parent window, localStorage, or cookies
- Cannot navigate or access external resources beyond P5.js CDN
- Safe for user-generated content in platforms like VibeFeed

### Tips

- Keep sketches simple and performant (runs in browser)
- Use `createCanvas()` in setup to define canvas size
- Access mouse position with `mouseX` and `mouseY`
- Use `mouseIsPressed` or `keyIsPressed` for interactivity
- For complex sketches, consider splitting into functions

---

## Quiz Block

Interactive quiz with automatic state management, progress tracking, and scoring. No manual state handling required.

### Properties

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `type` | `"quiz"` | Yes | Block type identifier |
| `title` | string | No | Quiz title |
| `questions` | array | Yes | Array of question objects |

### Question Object

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `question` | string | Yes | Question text |
| `options` | array | Yes | Array of answer options (strings) |
| `correct` | number | Yes | Index of correct answer (0-based) |

### Example: Basic Quiz

```json
{
  "type": "quiz",
  "title": "JavaScript Fundamentals",
  "questions": [
    {
      "question": "What does HTML stand for?",
      "options": [
        "Hyper Text Markup Language",
        "High Tech Modern Language",
        "Home Tool Markup Language"
      ],
      "correct": 0
    },
    {
      "question": "Which company developed JavaScript?",
      "options": [
        "Microsoft",
        "Netscape",
        "Oracle",
        "Apple"
      ],
      "correct": 1
    },
    {
      "question": "What year was JavaScript created?",
      "options": [
        "1993",
        "1995",
        "1997",
        "2000"
      ],
      "correct": 1
    }
  ]
}
```

### Features

- **Automatic State Management**: Quiz progress tracked internally
- **Progress Bar**: Visual progress indicator
- **Score Tracking**: Automatic scoring with percentage
- **Results Screen**: Shows final score with retry option
- **Multiple Choice**: Supports 2-10 options per question
- **Responsive**: Works on mobile and desktop

### Quiz Flow

1. Shows question 1 with progress bar
2. User selects answer
3. Advances to next question automatically
4. Repeats until all questions answered
5. Shows results screen with score and retry button

### Template Interpolation

Questions and options support template variables:

```json
{
  "type": "quiz",
  "title": "{{site.title}} Knowledge Check",
  "questions": [
    {
      "question": "What is 2 + 2?",
      "options": ["3", "4", "5"],
      "correct": 1
    }
  ]
}
```

### Tips

- Keep questions concise (1-2 sentences max)
- Use 3-4 options per question for best UX
- Randomize option order in your JSON for variety
- Add a descriptive title for context
- Great for education, onboarding, or engagement

---

## Component Reference

Reuse templates defined in the `components` object.

### Properties

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `$ref` | string | Yes | Component name from `components` object |
| `...props` | any | No | Any additional properties passed to template |

### Define Component (in site.json)

**IMPORTANT:** Components must be **HTML strings**, not objects with `type` and `html` properties.

```json
{
  "components": {
    "cta-button": "<a href=\"{{url}}\" role=\"button\" class=\"{{style}}\">{{label}}</a>",
    "feature-card": "<article class=\"card\"><i data-lucide=\"{{icon}}\"></i><h4>{{title}}</h4><p>{{description}}</p></article>"
  }
}
```

### Common Mistake

**WRONG** (causes `template.replace is not a function` error):
```json
{
  "components": {
    "card": {
      "type": "html",
      "html": "<div>{{title}}</div>"
    }
  }
}
```

**CORRECT:**
```json
{
  "components": {
    "card": "<div>{{title}}</div>"
  }
}
```

### Use Component (in page content)

```json
{
  "$ref": "cta-button",
  "label": "Enroll Now",
  "url": "/enroll",
  "style": "primary"
}
```

```json
{
  "$ref": "feature-card",
  "icon": "award",
  "title": "Certifications",
  "description": "Earn industry-recognized certificates"
}
```

---

## Templating Syntax

All string values in blocks support Mustache-style template interpolation.

### Variables

Access `site` config and reactive `state`:

```
{{site.title}}
{{site.description}}
{{state.userName}}
{{state.courseCount}}
```

### Functions

Functions defined in the `functions` object are registered globally and can be called:
1. **In templates** via `{{funcName(args)}}` interpolation
2. **In onclick handlers** directly as `onclick="funcName(args)"`

Functions have access to `Render.state` and `Render.site`.

**Define functions:**
```json
{
  "functions": {
    "year": "() => new Date().getFullYear()",
    "upper": "(str) => str.toUpperCase()",
    "formatDate": "(date) => new Date(date).toLocaleDateString()",
    "checkAnswer": "(idx) => { Render.state.score += idx === Render.state.answer ? 1 : 0 }",
    "addItem": "(item) => { Render.state.items = [...Render.state.items, item] }"
  }
}
```

**Use in templates (interpolation):**
```
© {{year()}} LearnHub
{{upper(site.title)}}
Published: {{formatDate('2025-01-01')}}
```

**Use in onclick handlers (direct call):**
```html
<button onclick="checkAnswer(0)">Option A</button>
<button onclick="addItem('New Item')">Add Item</button>
```

> **Note:** Function names should not clash with browser globals (e.g., avoid `alert`, `open`, `close`).

### Context Variables

In component templates, all props are available:

**Component definition:**
```json
{
  "components": {
    "greeting": "<h2>Hello, {{name}}!</h2><p>{{message}}</p>"
  }
}
```

**Usage:**
```json
{
  "$ref": "greeting",
  "name": "Student",
  "message": "Welcome to your dashboard"
}
```

### Each Loop (Advanced)

Iterate over arrays in HTML blocks:

```html
<ul>
{{#each items}}
  <li>{{this.name}} - {{this.value}}</li>
{{/each}}
</ul>
```

---

## Error Handling

If a block fails to render, render.js will display an error card instead:

```
⚠️ Error rendering block
Type: section
Error: Missing required property 'resources'
```

Check browser console for detailed error messages.

---

## Best Practices

1. **Keep content in JSON** - Don't embed complex HTML; use blocks instead
2. **Use semantic block types** - Prefer `hero`, `section`, `code` over `html` when possible
3. **Leverage components** - Define reusable patterns in `components`
4. **Responsive columns** - Use object syntax for mobile-friendly layouts
5. **Validate with schema** - Use `schema.json` to catch errors early

---

## Quick Reference

| Block Type | Use For | Key Properties |
|------------|---------|----------------|
| `hero` | Landing page headers | `headline`, `subhead`, `cta` |
| `section` | Feature grids, cards | `resources`, `columns` |
| `markdown` | Text content, docs | `content` |
| `code` | Code examples | `code`, `language` |
| `button` | Interactive actions (safe actions supported) | `label`, `action`, `variant` |
| `state` | Initialize state | `init` |
| `table` | Tabular data | `data`, `striped` |
| `html` | Custom layouts | `html` |
| `mermaid` | Diagrams, flowcharts | `content`, `theme` |
| `frappe-chart` | Data visualization | `chartType`, `labels`, `datasets` |
| `p5js` | Creative coding, animations, games | `code`, `width`, `height` |
| `quiz` | Interactive quizzes | `questions`, `title` |
| `$ref` | Reusable components | Component name, props |

---

## Examples by Use Case

### Landing Page
- Hero (main value prop)
- Section (features, 3 columns)
- Section (testimonials, 2 columns)
- HTML (CTA banner)

### Interactive Quiz
- State (step, score, questions array)
- Hero with dynamic subhead (Question {{state.step + 1}})
- Conditional blocks for each step
- Button blocks with score actions

### Documentation
- Markdown (intro text)
- Code (installation)
- Section (guides grid)
- Markdown (detailed content)

### Course Catalog
- Section (courses, 4 columns)
- Markdown (category description)
- HTML (filters/search)

### Blog Post
- Markdown (article content)
- Code (code snippets)
- HTML (author bio card)
