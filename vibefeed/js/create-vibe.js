// ============================================
// Vibe Generation
// ============================================

async function generateVibe() {
  const input = document.getElementById('chat-input')
  const message = input.value.trim()

  if ((!message && !currentImageBase64) || isGenerating) return

  if (currentPlan && !currentPlan._isDefault) {
    const canCreate = await api.plans.canCreateVibe()
    if (!canCreate) {
      const limit = currentPlan.monthly_limit || 10
      addChatMessage('error', `You've used all ${limit} generations today! Upgrade to Premium for 100/day.`)
      return
    }
  }

  try {
    await api.plans.incrementUsage()
    currentPlan = await api.plans.get()
    updatePlanUI()
  } catch (e) {
    console.warn('Failed to increment usage:', e)
  }

  const effectiveMessage = message || 'Create a vibe based on this image'

  lastUserMessage = effectiveMessage
  if (message) {
    addChatMessage('user', message)
  }
  input.value = ''
  autoResize(input)
  updateGenerateButtonState()

  isGenerating = true
  showTypingIndicator()

  if (isMobile()) {
    toggleMobileView('preview')
  }

  try {
    await streamVibeGeneration(effectiveMessage)
  } catch (e) {
    hideTypingIndicator()
    addChatMessage('error', `Error: ${e.message}`)
  }

  isGenerating = false
}

async function streamVibeGeneration(userMessage) {
  const url = '/api/claude'

  let userContent = []

  if (currentImageBase64) {
    const matches = currentImageBase64.match(/^data:(.+);base64,(.+)$/)
    if (matches) {
      const mediaType = matches[1]
      const base64Data = matches[2]

      userContent.push({
        type: "image",
        source: {
          type: "base64",
          media_type: mediaType,
          data: base64Data
        }
      })
    }
  }

  let textPrompt
  if (currentVibeContent.length > 0) {
    const currentJson = JSON.stringify({ blocks: currentVibeContent, tags: currentTags }, null, 2)
    textPrompt = `CURRENT POST:\n${currentJson}\n\nREQUEST: ${userMessage}\n\nUpdate the post based on the request. Return complete JSON with "blocks" and "tags".`
  } else {
    const imageInstruction = currentImageUrl
      ? `\n\nINCLUDE THE IMAGE: After the hero block, add a markdown block with the image using this URL placeholder: [IMAGE_URL]. Example: { "type": "markdown", "content": "![Image]([IMAGE_URL])" }`
      : ''
    textPrompt = `${currentImageBase64 ? 'Based on the image and this description: ' : 'Create a social media post about: '}${userMessage}${imageInstruction}\n\nReturn JSON with "blocks" array and "tags" array.`
  }

  userContent.push({
    type: "text",
    text: textPrompt + "\n\nIMPORTANT: Return ONLY valid JSON object with 'blocks' and 'tags' fields. NO markdown code fences like ```json. Just the raw JSON object starting with { and ending with }."
  })

  const messages = [...chatHistory]
  messages.push({
    role: "user",
    content: userContent
  })

  let systemPrompt = getVibeSystemPrompt()
  if (currentUserProfile?.bio) {
    systemPrompt += `\n\n## Creator Context (use subtly, don't overfit)\nThe creator describes themselves as: "${currentUserProfile.bio}"\nUse this only as a hint for language preference or tone if relevant to their request.`
  }

  const body = {
    model: 'claude-sonnet-4-5-20250929',
    max_tokens: 2048,
    system: systemPrompt,
    messages: messages,
    stream: true
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body)
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: { message: response.statusText } }))
    hideTypingIndicator()
    addChatMessage('error', `API Error: ${error.error?.message || 'Unknown error'}`)
    return
  }

  const reader = response.body.getReader()
  activeStreamReader = reader
  const decoder = new TextDecoder()
  let buffer = ''
  let fullText = ''

  hideTypingIndicator()

  lastRenderedBlockCount = 0
  streamingBlockIdCounter = 0

  const previewContent = document.getElementById('preview-content')
  previewContent.innerHTML = `
    <div class="preview-card">
      <div class="preview-card-header">
        <div class="avatar">${currentUser?.user_metadata?.full_name?.[0] || 'U'}</div>
        <div>
          <strong>${currentUser?.user_metadata?.full_name || 'You'}</strong>
          <div style="font-size: 0.8rem; color: var(--pico-muted-color);">Creating...</div>
        </div>
      </div>
      <div class="preview-card-body streaming-blocks-container" id="streaming-blocks">
        <div class="block-loader">
          <span class="block-loader-icon">✨</span>
          <span class="block-loader-text">Starting to create your vibe...</span>
          <div class="block-loader-spinner"></div>
        </div>
      </div>
    </div>
  `

  const streamingContainer = document.getElementById('streaming-blocks')

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() || ''

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6)
          if (data === '[DONE]') continue

          try {
            const event = JSON.parse(data)
            if (event.type === 'content_block_delta' && event.delta?.text) {
              fullText += event.delta.text

              const { blocks, pendingType } = extractCompleteBlocks(fullText)
              if (blocks.length > 0 || pendingType) {
                await renderStreamingBlocks(blocks, pendingType, streamingContainer)
              }
            }
          } catch (e) {}
        }
      }
    }
  } catch (e) {
    if (e.name !== 'AbortError') throw e
  }

  activeStreamReader = null

  try {
    const cleanedText = stripMarkdownFences(fullText)
    const result = JSON.parse(cleanedText)

    let blocks, tags

    if (Array.isArray(result)) {
      blocks = result
      tags = []
    } else if (result.blocks) {
      blocks = result.blocks
      tags = result.tags || []
    } else {
      throw new Error('Invalid response format')
    }

    if (Array.isArray(blocks) && blocks.length > 0) {
      const isPremium = currentPlan && currentPlan.plan === 'premium'
      const maxBlocks = isPremium ? 5 : 2
      let sanitizedBlocks = sanitizeVibeBlocks(blocks.slice(0, maxBlocks))

      if (!isPremium) {
        sanitizedBlocks = sanitizedBlocks.filter(block => block.type !== 'p5js')
      }

      if (sanitizedBlocks.length === 0) {
        throw new Error('All blocks were filtered by security checks')
      }

      if (currentImageUrl) {
        sanitizedBlocks = sanitizedBlocks.map(block => {
          if (block.type === 'markdown' && block.content) {
            block.content = block.content.replace(/\[IMAGE_URL\]/g, currentImageUrl)
          }
          return block
        })

        const hasImageBlock = sanitizedBlocks.some(block =>
          block.type === 'markdown' && block.content && block.content.includes(currentImageUrl)
        )

        if (!hasImageBlock && sanitizedBlocks[0]?.type === 'hero') {
          sanitizedBlocks.splice(1, 0, {
            type: 'markdown',
            content: `![Uploaded Image](${currentImageUrl})`
          })
        }
      }

      currentVibeContent = sanitizedBlocks

      if (Array.isArray(tags)) {
        currentTags = tags.map(t => String(t).toLowerCase().replace(/[^a-z0-9]/g, '')).filter(t => t)
        renderTags()
      }

      chatHistory.push({
        role: "user",
        content: lastUserMessage
      })
      chatHistory.push({
        role: "assistant",
        content: JSON.stringify({ blocks, tags })
      })

      if (chatHistory.length > 8) {
        chatHistory = chatHistory.slice(-8)
      }

      if (currentImageBase64) {
        clearImage()
      }

      await renderPreview()
      document.getElementById('post-btn').disabled = false
      addChatMessage('assistant', 'Vibe generated! You can refine it or post it.')
    } else {
      throw new Error('Invalid response format')
    }
  } catch (e) {
    console.error('Parse error:', e, fullText)
    addChatMessage('error', `Failed to parse response: ${e.message}`)
    previewContent.innerHTML = `
      <div class="preview-card">
        <div class="preview-placeholder">
          <i data-lucide="alert-circle"></i>
          <p>Generation failed</p>
          <small>Try describing your vibe again</small>
        </div>
      </div>
    `
    lucide.createIcons()
  }
}

// ============================================
// Preview Rendering
// ============================================
let blockIdCounter = 0

async function renderPreview() {
  const previewContent = document.getElementById('preview-content')

  previewContent.innerHTML = `
    <div class="preview-card">
      <div class="preview-card-header">
        <div class="avatar">${currentUser?.user_metadata?.full_name?.[0] || 'U'}</div>
        <div>
          <strong>${currentUser?.user_metadata?.full_name || 'You'}</strong>
          <div style="font-size: 0.8rem; color: var(--pico-muted-color);">Just now</div>
        </div>
      </div>
      <div class="preview-card-body" id="preview-body"></div>
    </div>
  `

  const previewBody = document.getElementById('preview-body')
  let hasRenderError = false

  errorTracker.renderErrors = []

  for (const block of currentVibeContent) {
    const blockId = `vibe-block-${++blockIdCounter}`
    const blockEl = document.createElement('div')
    blockEl.className = 'vibe-block'
    blockEl.id = blockId
    previewBody.appendChild(blockEl)

    let blockToRender = block
    if (block.type === 'quiz') {
      blockToRender = {
        ...block,
        onComplete: async (completionData) => {
          console.log('[CREATE DEBUG] Quiz onComplete callback triggered!')
          console.log('[CREATE DEBUG] Completion data:', completionData)

          setTimeout(() => {
            const quizContainers = document.querySelectorAll('.quiz-container')
            const lastQuizContainer = quizContainers[quizContainers.length - 1]

            if (lastQuizContainer) {
              const oldMsg = document.getElementById('quiz-preview-message')
              if (oldMsg) oldMsg.remove()

              const previewMsg = document.createElement('div')
              previewMsg.id = 'quiz-preview-message'
              previewMsg.style.cssText = 'margin: 1.5rem 0; padding: 1.5rem; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; border-radius: 1rem; text-align: center; box-shadow: 0 4px 6px rgba(0,0,0,0.1);'
              previewMsg.innerHTML = `
                <div style="font-size: 2.5rem; margin-bottom: 0.5rem;">🎯</div>
                <strong style="font-size: 1.3rem; display: block; margin-bottom: 0.5rem;">Quiz Preview Complete!</strong>
                <div style="font-size: 1.4rem; margin: 0.75rem 0; font-weight: 600;">
                  Your score: ${completionData.score}/${completionData.totalQuestions} (${completionData.percentage}%)
                </div>
                <div style="margin-top: 1rem; padding: 1rem; background: rgba(255,255,255,0.2); border-radius: 0.5rem; font-size: 0.95rem;">
                  💡 This is a preview. Quiz completions will be tracked and saved to the leaderboard once you post this vibe!
                </div>
              `
              lastQuizContainer.insertAdjacentElement('afterend', previewMsg)
              previewMsg.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
            }
          }, 100)
        }
      }
    }

    try {
      await Render.inject(`#${blockId}`, blockToRender, { mode: 'replace' })
    } catch (e) {
      hasRenderError = true
      const errorMsg = e.message || String(e)

      errorTracker.renderErrors.push({
        blockType: block.type,
        error: errorMsg,
        block: JSON.stringify(block),
        timestamp: new Date().toISOString()
      })

      console.error('Error rendering block:', e)

      blockEl.innerHTML = `
        <div style="padding: 1rem; background: var(--pico-del-background-color); border-radius: 0.5rem; color: var(--pico-del-color);">
          <p style="margin: 0 0 0.5rem 0;"><strong>Error rendering block (${block.type}):</strong> ${errorMsg}</p>
          <button class="error-fix-btn" onclick="sendErrorReport()">
            <i data-lucide="wrench"></i> Fix This
          </button>
        </div>
      `
    }
  }

  if (hasRenderError) {
    const errorSummary = errorTracker.renderErrors.map(e => `${e.blockType}: ${e.error}`).join(', ')
    addChatMessage('error', `Render error: ${errorSummary}`, errorTracker.renderErrors)
  }

  lucide.createIcons()
}

// ============================================
// Post Vibe
// ============================================
async function postVibe() {
  if (currentVibeContent.length === 0) return

  try {
    const canPost = await api.plans.canPostVibe()
    if (!canPost) {
      const plan = currentPlan?.plan || 'free'
      const limit = api.plans.getMonthlyPostLimit(plan)
      addChatMessage('error', `You've reached your monthly limit of ${limit} vibes! ${plan === 'free' ? 'Upgrade to Premium for 350/month.' : 'Your limit resets next month.'}`)
      return
    }
  } catch (e) {
    console.warn('Could not check monthly limit:', e)
  }

  const postBtn = document.getElementById('post-btn')
  postBtn.disabled = true
  postBtn.innerHTML = '<i data-lucide="loader" style="animation: spin 1s linear infinite;"></i> Posting...'

  let isFirstVibe = false
  try {
    const { count } = await supabaseClient
      .from('vibes')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', currentUser.id)
    isFirstVibe = count === 0
  } catch (e) {
    console.warn('Could not check vibe count:', e)
  }

  try {
    const isPublic = document.getElementById('visibility').value === 'public'

    const vibe = await api.vibes.create({
      content: currentVibeContent,
      tags: currentTags,
      chat_history: { messages: chatHistory },
      parent_vibe_id: parentVibeId
    })

    if (!isPublic) {
      await supabaseClient
        .from('vibes')
        .update({ is_public: false })
        .eq('id', vibe.id)
    } else {
      api.notifications.notifyNewPost(vibe.id)
    }

    if (isFirstVibe) {
      addChatMessage('system', '🎉 Congratulations on your first vibe! 🎉')
      setTimeout(() => {
        addChatMessage('system', 'You\'re now part of the VibeFeed community! Keep creating and sharing amazing content.')
      }, 500)

      setTimeout(() => {
        window.location.href = 'app?firstVibe=true'
      }, 2500)
    } else {
      addChatMessage('system', 'Vibe posted successfully!')

      setTimeout(() => {
        window.location.href = 'app'
      }, 1000)
    }

  } catch (error) {
    addChatMessage('error', 'Error posting vibe: ' + error.message)
    postBtn.disabled = false
    postBtn.innerHTML = '<i data-lucide="send"></i><span>Post!</span>'
    lucide.createIcons()
  }
}

// Add spin animation
const style = document.createElement('style')
style.textContent = '@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }'
document.head.appendChild(style)
