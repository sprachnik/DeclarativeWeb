// ============================================
// UI Utility Functions
// ============================================

function autoResize(textarea) {
  textarea.style.height = 'auto'
  textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px'
}

function handleKeyDown(event) {
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault()
    generateVibe()
  }
}

function toggleMobileView(show) {
  const chatPanel = document.querySelector('.chat-panel')
  const previewPanel = document.querySelector('.preview-panel')

  if (show === 'chat') {
    chatPanel.classList.remove('hidden')
    previewPanel.classList.remove('visible')
  } else if (show === 'preview') {
    chatPanel.classList.add('hidden')
    previewPanel.classList.add('visible')
  }
}

function isMobile() {
  return window.innerWidth <= 768
}

function escapeHtml(text) {
  const div = document.createElement('div')
  div.textContent = text
  return div.innerHTML
}

function stripMarkdownFences(text) {
  let cleaned = text.trim()
  cleaned = cleaned.replace(/^```(?:json|JSON)?\s*\n?/, '')
  cleaned = cleaned.replace(/\n?\s*```\s*$/, '')
  if (cleaned.startsWith('`') && cleaned.endsWith('`')) {
    cleaned = cleaned.slice(1, -1)
  }
  cleaned = cleaned.trim()
  if (!cleaned.startsWith('{') && !cleaned.startsWith('[')) {
    const objMatch = cleaned.match(/\{[\s\S]*\}/)
    const arrMatch = cleaned.match(/\[[\s\S]*\]/)
    if (objMatch) cleaned = objMatch[0]
    else if (arrMatch) cleaned = arrMatch[0]
  }
  return cleaned
}

// ============================================
// Tag Handling
// ============================================
function renderTags() {
  const container = document.getElementById('tags-container')
  const input = document.getElementById('tag-input')
  container.innerHTML = currentTags.map(tag => `
    <span class="tag">
      #${tag}
      <button class="tag-remove" onclick="removeTag('${tag}')">
        <i data-lucide="x" style="width: 12px; height: 12px;"></i>
      </button>
    </span>
  `).join('')
  container.appendChild(input)
  lucide.createIcons()
}

function addTag(tag) {
  tag = tag.toLowerCase().replace(/[^a-z0-9]/g, '')
  if (tag && !currentTags.includes(tag) && currentTags.length < 10) {
    currentTags.push(tag)
    renderTags()
  }
}

function removeTag(tag) {
  currentTags = currentTags.filter(t => t !== tag)
  renderTags()
}

function handleTagInput(e) {
  if (e.key === 'Enter' || e.key === ',') {
    e.preventDefault()
    const input = e.target
    if (input.value.trim()) {
      addTag(input.value.trim())
      input.value = ''
    }
  }
}

// ============================================
// Chat Functions
// ============================================
function addChatMessage(type, content, errorDetails = null) {
  const messages = document.getElementById('chat-messages')
  const msg = document.createElement('div')
  msg.className = `chat-message ${type}`
  msg.textContent = content

  if (type === 'error') {
    errorTracker.lastError = {
      message: content,
      details: errorDetails,
      timestamp: new Date().toISOString(),
      consoleErrors: [...errorTracker.consoleErrors],
      renderErrors: [...errorTracker.renderErrors]
    }

    const fixBtn = document.createElement('button')
    fixBtn.className = 'error-fix-btn'
    fixBtn.innerHTML = '<i data-lucide="wrench"></i> Fix This'
    fixBtn.onclick = () => sendErrorReport()
    msg.appendChild(document.createElement('br'))
    msg.appendChild(fixBtn)

    setTimeout(() => lucide.createIcons(), 10)
  }

  messages.appendChild(msg)
  messages.scrollTop = messages.scrollHeight
  return msg
}

function sendErrorReport() {
  if (!errorTracker.lastError) return

  const error = errorTracker.lastError
  let debugInfo = `Oops! that doesn't work, please fix:\n\n`
  debugInfo += `Error: ${error.message}\n\n`

  if (error.consoleErrors.length > 0) {
    debugInfo += `Console Errors:\n`
    error.consoleErrors.forEach(err => {
      debugInfo += `- [${err.timestamp}] ${err.message}\n`
    })
    debugInfo += `\n`
  }

  if (error.renderErrors.length > 0) {
    debugInfo += `Render Errors:\n`
    error.renderErrors.forEach(err => {
      debugInfo += `- Block Type: ${err.blockType}, Error: ${err.error}\n`
    })
    debugInfo += `\n`
  }

  if (currentVibeContent.length > 0) {
    debugInfo += `Current Vibe Content:\n${JSON.stringify(currentVibeContent, null, 2)}\n\n`
  }

  if (lastUserMessage) {
    debugInfo += `Last Request: ${lastUserMessage}\n`
  }

  addChatMessage('user', debugInfo)

  const input = document.getElementById('chat-input')
  input.value = debugInfo
  generateVibe()
}

function showTypingIndicator() {
  const messages = document.getElementById('chat-messages')
  const indicator = document.createElement('div')
  indicator.className = 'typing-indicator'
  indicator.id = 'typing-indicator'
  indicator.innerHTML = '<span></span><span></span><span></span>'
  messages.appendChild(indicator)
  messages.scrollTop = messages.scrollHeight
}

function hideTypingIndicator() {
  const indicator = document.getElementById('typing-indicator')
  if (indicator) indicator.remove()
}

// ============================================
// Plan UI Functions
// ============================================
function updatePlanUI() {
  const banner = document.getElementById('upgrade-banner')
  const usageBadge = document.getElementById('usage-badge')

  if (currentPlan) {
    const isPremium = currentPlan.plan === 'premium'

    if (isPremium) {
      banner.style.display = 'none'
    } else {
      const dismissed = sessionStorage.getItem('upgradeBannerDismissed')
      if (!dismissed) {
        banner.style.display = 'flex'
      }
    }

    const limit = currentPlan.monthly_limit || 10
    const used = currentPlan.vibes_used || 0
    const remaining = Math.max(0, limit - used)

    usageBadge.textContent = `${remaining}/${limit}`
    usageBadge.title = `${remaining} generations remaining today`
    usageBadge.style.display = 'inline'

    if (remaining <= 2) {
      usageBadge.classList.add('low')
    } else {
      usageBadge.classList.remove('low')
    }
  }
}

async function showInitialChatMessage() {
  const messages = document.getElementById('chat-messages')
  messages.innerHTML = ''

  if (currentPlan) {
    const isPremium = currentPlan.plan === 'premium'

    const genLimit = currentPlan.monthly_limit || 10
    const genUsed = currentPlan.vibes_used || 0
    const genRemaining = Math.max(0, genLimit - genUsed)

    const postLimit = api.plans.getMonthlyPostLimit(currentPlan.plan)
    let postCount = 0
    try {
      postCount = await api.plans.getMonthlyPostCount()
    } catch (e) {
      console.warn('Could not get post count:', e)
    }
    const postsRemaining = Math.max(0, postLimit - postCount)

    const blocks = isPremium ? 5 : 2

    let planInfo = isPremium
      ? `⭐ Premium: ${genRemaining}/${genLimit} generations today • ${postsRemaining}/${postLimit} posts this month • ${blocks} blocks`
      : `Free: ${genRemaining}/${genLimit} generations today • ${postsRemaining}/${postLimit} posts this month • ${blocks} blocks`

    addChatMessage('system', planInfo)
  }

  addChatMessage('system', 'Describe what you want to create - a recipe, chart, quiz, workflow, or anything you want to share!')
}

function dismissUpgradeBanner() {
  document.getElementById('upgrade-banner').style.display = 'none'
  sessionStorage.setItem('upgradeBannerDismissed', 'true')
}
