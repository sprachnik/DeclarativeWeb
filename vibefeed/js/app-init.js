// ============================================
// App Initialization
// ============================================

async function init() {
  const session = await auth.getSession()

  if (!session) {
    window.location.href = 'login'
    return
  }

  currentUser = session.user

  // Get user profile
  try {
    currentProfile = await api.users.getById(currentUser.id)
    if (!currentProfile) {
      window.location.href = 'onboarding'
      return
    }
    updateUserDisplay()
  } catch {
    window.location.href = 'onboarding'
    return
  }

  // Check if user has created at least one vibe, redirect to onboarding if not
  try {
    const { count, error } = await supabaseClient
      .from('vibes')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', currentUser.id)

    if (!error && count === 0) {
      window.location.href = 'onboarding'
      return
    }
  } catch (e) {
    console.warn('Could not check vibe count:', e)
  }

  // Load following list
  try {
    const following = await api.follows.getFollowing(currentUser.id, { limit: 500 })
    following.forEach(u => followedUsers.add(u.id))
  } catch (e) {
    console.error('Error loading following:', e)
  }

  // Load notifications
  await loadNotifications()

  // Check for first vibe celebration
  const params = new URLSearchParams(window.location.search)
  if (params.get('firstVibe') === 'true') {
    window.history.replaceState({}, '', 'app')
    showFirstVibeCelebration()
  }

  // Load plan and show upgrade banner if free
  try {
    currentPlan = await api.plans.get()
    updatePlanUI()
  } catch (e) {
    console.error('Error loading plan:', e)
  }

  // Load initial view and set correct nav state
  if (currentView !== 'feed') {
    navigate(currentView)
  } else {
    loadViewContent(currentView)
  }
}

// Start
init()
