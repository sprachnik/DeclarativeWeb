// ============================================
// Streaming Block Parser
// ============================================

const BLOCK_LOADING_MESSAGES = {
  hero: ['✨ Crafting your headline...', '🎯 Making it punchy...', '💫 Setting the vibe...'],
  markdown: ['📝 Writing content...', '✍️ Composing text...', '📄 Formatting...'],
  section: ['📦 Building sections...', '🧩 Arranging cards...', '🎨 Styling resources...'],
  table: ['📊 Organizing data...', '📋 Building table...', '🔢 Crunching numbers...'],
  mermaid: ['🔀 Drawing diagram...', '📐 Connecting nodes...', '🎭 Visualizing flow...'],
  'frappe-chart': ['📈 Plotting chart...', '📊 Visualizing data...', '🎨 Adding colors...'],
  quiz: ['🧠 Crafting questions...', '❓ Building quiz...', '🎯 Setting answers...'],
  p5js: ['🎨 Coding animation...', '✨ Creating magic...', '🖼️ Drawing canvas...'],
  button: ['🔘 Creating button...', '👆 Adding action...', '🎯 Making clickable...'],
  default: ['🔮 Creating something cool...', '✨ Working on it...', '🎭 Building magic...']
}

const BLOCK_ICONS = {
  hero: '🎯',
  markdown: '📝',
  section: '📦',
  table: '📊',
  mermaid: '🔀',
  'frappe-chart': '📈',
  quiz: '🧠',
  p5js: '🎨',
  button: '🔘',
  default: '✨'
}

function getLoadingMessage(blockType) {
  const messages = BLOCK_LOADING_MESSAGES[blockType] || BLOCK_LOADING_MESSAGES.default
  return messages[Math.floor(Math.random() * messages.length)]
}

function getBlockIcon(blockType) {
  return BLOCK_ICONS[blockType] || BLOCK_ICONS.default
}

// Extract complete block objects from partial JSON string
function extractCompleteBlocks(jsonStr) {
  const blocks = []
  let pendingType = null

  // Clean up markdown fences
  let cleaned = jsonStr.trim()
  cleaned = cleaned.replace(/^```(?:json|JSON)?\s*\n?/, '')

  // Try to find blocks array content
  const blocksMatch = cleaned.match(/"blocks"\s*:\s*\[/)
  if (!blocksMatch) {
    // Check if there's a pending block type we can detect
    const typeMatch = cleaned.match(/"type"\s*:\s*"(\w+)"/)
    if (typeMatch) {
      pendingType = typeMatch[1]
    }
    return { blocks, pendingType }
  }

  // Get content after "blocks": [
  const startIdx = blocksMatch.index + blocksMatch[0].length
  let content = cleaned.slice(startIdx)

  // Try to extract each complete block object
  let depth = 0
  let blockStart = -1
  let inString = false
  let escapeNext = false

  for (let i = 0; i < content.length; i++) {
    const char = content[i]

    if (escapeNext) {
      escapeNext = false
      continue
    }

    if (char === '\\') {
      escapeNext = true
      continue
    }

    if (char === '"' && !escapeNext) {
      inString = !inString
      continue
    }

    if (inString) continue

    if (char === '{') {
      if (depth === 0) blockStart = i
      depth++
    } else if (char === '}') {
      depth--
      if (depth === 0 && blockStart !== -1) {
        // Found complete block
        const blockStr = content.slice(blockStart, i + 1)
        try {
          const block = JSON.parse(blockStr)
          if (block.type) {
            blocks.push(block)
          }
        } catch (e) {
          // Not valid JSON yet
        }
        blockStart = -1
      }
    } else if (char === ']' && depth === 0) {
      // End of blocks array
      break
    }
  }

  // Check for pending incomplete block
  if (depth > 0 && blockStart !== -1) {
    const partialBlock = content.slice(blockStart)
    const typeMatch = partialBlock.match(/"type"\s*:\s*"(\w+)"/)
    if (typeMatch) {
      pendingType = typeMatch[1]
    }
  }

  return { blocks, pendingType }
}

// Render streaming blocks preview
let streamingBlockIdCounter = 0
let lastRenderedBlockCount = 0

async function renderStreamingBlocks(completeBlocks, pendingType, container) {
  // Only update if something changed
  if (completeBlocks.length === lastRenderedBlockCount && !pendingType) {
    return
  }

  // Render complete blocks that haven't been rendered yet
  for (let i = lastRenderedBlockCount; i < completeBlocks.length; i++) {
    const block = completeBlocks[i]
    const blockId = `streaming-block-${++streamingBlockIdCounter}`
    const blockEl = document.createElement('div')
    blockEl.className = 'streaming-complete-block vibe-block'
    blockEl.id = blockId
    container.appendChild(blockEl)

    try {
      await Render.inject(`#${blockId}`, sanitizeBlock(block), { mode: 'replace' })
    } catch (e) {
      blockEl.innerHTML = `<div style="padding: 0.5rem; color: var(--pico-muted-color); font-size: 0.85rem;">Block loading...</div>`
    }
  }

  lastRenderedBlockCount = completeBlocks.length

  // Update or add pending block loader
  let loaderEl = container.querySelector('.block-loader')

  if (pendingType && ALLOWED_VIBE_TYPES.includes(pendingType)) {
    if (!loaderEl) {
      loaderEl = document.createElement('div')
      loaderEl.className = 'block-loader'
      container.appendChild(loaderEl)
    }

    loaderEl.innerHTML = `
      <span class="block-loader-icon">${getBlockIcon(pendingType)}</span>
      <span class="block-loader-text">${getLoadingMessage(pendingType)}</span>
      <div class="block-loader-spinner"></div>
    `
  } else if (loaderEl && completeBlocks.length > 0) {
    // Remove loader if no pending type and we have blocks
    loaderEl.remove()
  }

  // Initialize lucide icons
  if (window.lucide) lucide.createIcons()
}
