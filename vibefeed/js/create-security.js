// ============================================
// Security: Sanitize Vibe Blocks
// ============================================

const BASE_VIBE_TYPES = ['markdown', 'hero', 'section', 'table', 'mermaid', 'frappe-chart', 'quiz', 'button']

function getAllowedVibeTypes() {
  if (currentPlan && currentPlan.plan === 'premium') {
    return [...BASE_VIBE_TYPES, 'p5js']
  }
  return BASE_VIBE_TYPES
}

const ALLOWED_VIBE_TYPES = ['markdown', 'hero', 'section', 'table', 'mermaid', 'frappe-chart', 'p5js', 'quiz', 'button']

const EVENT_HANDLERS = [
  'onclick', 'ondblclick', 'onmousedown', 'onmouseup', 'onmouseover', 'onmousemove',
  'onmouseout', 'onmouseenter', 'onmouseleave', 'onkeydown', 'onkeypress', 'onkeyup',
  'onfocus', 'onblur', 'onchange', 'oninput', 'onsubmit', 'onreset', 'onload', 'onerror'
]

function sanitizeVibeBlocks(blocks) {
  if (!Array.isArray(blocks)) return []
  return blocks
    .filter(block => block && typeof block === 'object' && ALLOWED_VIBE_TYPES.includes(block.type))
    .map(block => sanitizeBlock(block))
}

function sanitizeBlock(block) {
  const sanitized = { ...block }
  const SAFE_ACTION_TYPES = ['setState', 'navigate', 'toggleState', 'resetState']

  if (block.type === 'button' && block.action) {
    if (typeof block.action === 'object' && block.action.type) {
      if (!SAFE_ACTION_TYPES.includes(block.action.type)) {
        delete sanitized.action
      }
      if (block.action.fn) {
        delete sanitized.action
      }
    } else {
      delete sanitized.action
    }
  } else {
    delete sanitized.action
  }

  delete sanitized.actions
  delete sanitized.onClick
  delete sanitized.onAction
  delete sanitized.if
  delete sanitized.then
  delete sanitized.else
  delete sanitized.init
  delete sanitized.watch
  delete sanitized.each
  delete sanitized.as
  delete sanitized.template

  for (const key of Object.keys(sanitized)) {
    if (typeof sanitized[key] === 'string') {
      sanitized[key] = sanitizeString(sanitized[key])
    } else if (Array.isArray(sanitized[key])) {
      sanitized[key] = sanitizeArray(sanitized[key])
    } else if (typeof sanitized[key] === 'object' && sanitized[key] !== null) {
      sanitized[key] = sanitizeObject(sanitized[key])
    }
  }

  return sanitized
}

function sanitizeString(str) {
  if (typeof str !== 'string') return str
  let sanitized = str
  sanitized = sanitized.replace(/javascript\s*:/gi, '')
  sanitized = sanitized.replace(/data\s*:\s*text\/html/gi, '')
  for (const handler of EVENT_HANDLERS) {
    const regex = new RegExp(`\\s*${handler}\\s*=\\s*["'][^"']*["']`, 'gi')
    sanitized = sanitized.replace(regex, '')
  }
  sanitized = sanitized.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
  sanitized = sanitized.replace(/<script\b[^>]*>/gi, '')
  sanitized = sanitized.replace(/<\/script>/gi, '')
  return sanitized
}

function sanitizeArray(arr) {
  return arr.map(item => {
    if (typeof item === 'string') return sanitizeString(item)
    if (Array.isArray(item)) return sanitizeArray(item)
    if (typeof item === 'object' && item !== null) return sanitizeObject(item)
    return item
  })
}

function sanitizeObject(obj) {
  const sanitized = {}
  for (const key of Object.keys(obj)) {
    if (['action', 'actions', 'onClick', 'onAction', 'if', 'then', 'else'].includes(key)) continue
    if (typeof obj[key] === 'string') sanitized[key] = sanitizeString(obj[key])
    else if (Array.isArray(obj[key])) sanitized[key] = sanitizeArray(obj[key])
    else if (typeof obj[key] === 'object' && obj[key] !== null) sanitized[key] = sanitizeObject(obj[key])
    else sanitized[key] = obj[key]
  }
  return sanitized
}

// ============================================
// System Prompt Generator
// ============================================
function getVibeSystemPrompt() {
  const isPremium = currentPlan && currentPlan.plan === 'premium'
  const maxBlocks = isPremium ? 5 : 2

  const p5jsBlock = isPremium
    ? `\nP5JS: { "type": "p5js", "code": "function setup() { createCanvas(400, 300); } function draw() { background(220); }", "height": 300 }`
    : ''

  return `You are a social media post generator for VibeFeed. Generate creative, engaging posts as JSON.

## OUTPUT FORMAT
Return a JSON object with TWO fields:
1. "blocks" - array of content blocks (max ${maxBlocks})
2. "tags" - array of 3-5 relevant hashtags (lowercase, no #, alphanumeric only)

Example output:
{
  "blocks": [
    { "type": "hero", "headline": "My Amazing Recipe", "subhead": "Quick and delicious!" },
    { "type": "table", "data": [["Ingredient", "Amount"], ["Flour", "2 cups"]] }
  ],
  "tags": ["recipe", "cooking", "quickmeals", "dinner"]
}

## IMPORTANT RULES
- FIRST BLOCK MUST BE A HERO - this is the post title/headline
- Minimum 2 blocks: hero + one content block
- Maximum ${maxBlocks} blocks${!isPremium ? ' (upgrade to premium for up to 5)' : ''}
- Tags should be relevant, specific, and help discovery

## SECURITY RESTRICTIONS
- NO JavaScript, no event handlers, no script tags
- NO "html" blocks - use markdown instead
- NO links with javascript: protocol

## Allowed Block Types

HERO: { "type": "hero", "headline": "Title", "subhead": "Subtitle" }

MARKDOWN: { "type": "markdown", "content": "## Heading\\n\\nText with **bold**" }

SECTION: { "type": "section", "columns": 3, "resources": [{ "title": "Card", "description": "Details", "icon": "zap" }] }

TABLE: { "type": "table", "caption": "Title", "striped": true, "data": [["Header1", "Header2"], ["Row1", "Row2"]] }

MERMAID: { "type": "mermaid", "content": "graph TD\\n  A[Start] --> B[End]", "theme": "neutral" }

FRAPPE-CHART: { "type": "frappe-chart", "chartType": "bar", "title": "Chart", "labels": ["A", "B"], "datasets": [{ "name": "Data", "values": [10, 20] }], "height": 250 }
${p5jsBlock}
QUIZ: { "type": "quiz", "title": "Quiz Title", "questions": [{ "question": "Q?", "options": ["A", "B", "C"], "correct": 1 }] }

## Icons (Lucide)
zap, star, heart, check, user, mail, settings, search, home, trending-up, users, award, rocket, book, coffee, music

## Rules
1. Return JSON object ONLY - no markdown fences, no explanations
2. Include both "blocks" array and "tags" array
3. Tags: 3-5 lowercase alphanumeric strings
4. Be creative but CONCISE - social posts should be punchy`
}
