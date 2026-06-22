// ============================================
// Initialization
// ============================================

// Initialize Render.js
if (window.Render) {
  Render.init({
    data: {
      site: { title: 'VibeFeed' },
      state: {},
      pages: [{ path: '/', content: [] }]
    },
    target: '#render-dummy',
    showJsonButton: false
  })
}

window.addEventListener('DOMContentLoaded', async () => {
  if (window.lucide) lucide.createIcons()

  // Check auth
  const session = await auth.getSession()
  if (!session) {
    window.location.href = 'login'
    return
  }
  currentUser = session.user

  // Fetch user profile - redirect to onboarding if not exists
  try {
    currentUserProfile = await api.users.getById(currentUser.id)
    if (!currentUserProfile) {
      window.location.href = 'onboarding'
      return
    }
  } catch (e) {
    console.log('Could not load profile, redirecting to onboarding:', e)
    window.location.href = 'onboarding'
    return
  }

  // Load plan and update UI
  try {
    currentPlan = await api.plans.get()
    await api.plans.checkAndResetMonth()
    currentPlan = await api.plans.get()
    updatePlanUI()
    await showInitialChatMessage()
  } catch (e) {
    console.log('Could not load plan:', e)
    addChatMessage('system', 'Describe what you want to create - a recipe, chart, quiz, workflow, or anything you want to share!')
  }

  // Populate starter idea buttons
  populateStarterIdeas()

  // Check for revibe parameter
  const params = new URLSearchParams(window.location.search)
  const revibeId = params.get('revibe')
  if (revibeId) {
    await loadRevibeContent(revibeId)
  } else {
    document.getElementById('chat-input').focus()
  }
})

// Load original vibe for revibing
async function loadRevibeContent(vibeId) {
  try {
    const vibe = await api.vibes.get(vibeId)
    if (!vibe) {
      addChatMessage('error', 'Original vibe not found')
      return
    }

    parentVibeId = vibeId

    document.querySelector('.page-title').innerHTML = `
      <i data-lucide="sparkles"></i>
      Revibe from @${vibe.user?.username || 'user'}
    `
    lucide.createIcons()

    if (Array.isArray(vibe.content)) {
      currentVibeContent = vibe.content
    }
    if (Array.isArray(vibe.tags)) {
      currentTags = [...vibe.tags]
      renderTags()
    }

    if (currentVibeContent.length > 0) {
      renderPreview()
      document.getElementById('post-btn').disabled = false
    }

    addChatMessage('system', `Revibing from @${vibe.user?.username}. Modify it or post as-is!`)
    document.getElementById('chat-input').focus()

  } catch (error) {
    addChatMessage('error', 'Error loading vibe: ' + error.message)
  }
}
