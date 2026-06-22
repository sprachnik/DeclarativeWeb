// ============================================
// Profile Page
// ============================================

// Random logo emoji
const vibeEmojis = ['🎨', '✨', '🌈', '🎭', '🎪', '🎯', '🚀', '💫', '🔮', '🎸', '🌟', '🎬', '🎤', '🎧', '🌸', '🦋', '🍭', '⚡', '🔥', '💜']
document.getElementById('logo-emoji').textContent = vibeEmojis[Math.floor(Math.random() * vibeEmojis.length)]

// Initialize icons
lucide.createIcons()

let currentUser = null
let profileUser = null
let isOwnProfile = false
    let isFollowing = false
    let currentTab = 'vibes'

    // Get username from URL
    function getUsernameFromUrl() {
      const path = window.location.pathname
      const match = path.match(/\/@([^\/]+)/) || path.match(/\/profile(?:\.html)?\?u=([^&]+)/)
      if (match) return match[1]

      // Fallback to query param
      const params = new URLSearchParams(window.location.search)
      return params.get('u') || params.get('username')
    }

    // Format date
    function formatDate(dateStr) {
      const date = new Date(dateStr)
      return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
    }

    // Render profile
    function renderProfile(profile, counts, vibes) {
      const container = document.getElementById('main-content')

      container.innerHTML = `
        <div class="profile-header">
          <div class="profile-avatar">
            ${profile.avatar_url
              ? `<img src="${profile.avatar_url}" alt="${profile.display_name}">`
              : '<i data-lucide="user"></i>'}
          </div>
          <div class="profile-info">
            <h1 class="profile-name">${profile.display_name}</h1>
            <p class="profile-username">@${profile.username}</p>
            ${profile.bio ? `<p class="profile-bio">${profile.bio}</p>` : ''}
            <div class="profile-stats">
              <div class="stat">
                <span class="stat-value">${counts.followers}</span>
                <span class="stat-label">followers</span>
              </div>
              <div class="stat">
                <span class="stat-value">${counts.following}</span>
                <span class="stat-label">following</span>
              </div>
              <div class="stat">
                <span class="stat-value">${vibes.length}</span>
                <span class="stat-label">vibes</span>
              </div>
            </div>
            <div class="profile-actions" id="profile-actions">
              ${isOwnProfile
                ? `<a href="app#settings" role="button" class="secondary">Edit Profile</a>`
                : currentUser
                  ? `<button onclick="toggleFollow()" class="${isFollowing ? 'secondary outline' : 'contrast'}" id="follow-btn">
                      ${isFollowing ? 'Following' : 'Follow'}
                    </button>`
                  : `<a href="login" role="button" class="contrast">Follow</a>`}
            </div>
          </div>
        </div>

        <div class="tabs">
          <div class="tab ${currentTab === 'vibes' ? 'active' : ''}" onclick="switchTab('vibes')">Vibes</div>
          <div class="tab ${currentTab === 'likes' ? 'active' : ''}" onclick="switchTab('likes')">Likes</div>
        </div>

        <div id="tab-content">
          ${renderVibes(vibes)}
        </div>
      `

      lucide.createIcons()
    }

    // Render vibes
    function renderVibes(vibes) {
      if (vibes.length === 0) {
        return `
          <div class="empty-state">
            <i data-lucide="sparkles"></i>
            <h3>No vibes yet</h3>
            <p>${isOwnProfile ? 'Create your first vibe to share with the world' : 'This user hasn\'t created any vibes yet'}</p>
            ${isOwnProfile ? '<a href="app#create" role="button" class="contrast">Create a Vibe</a>' : ''}
          </div>
        `
      }

      return `
        <div class="vibe-grid">
          ${vibes.map(vibe => `
            <article class="vibe-card" onclick="window.location.href='vibe?id=${vibe.id}'">
              <div class="vibe-preview">
                ${getVibePreview(vibe.content)}
              </div>
              ${vibe.tags && vibe.tags.length > 0
                ? `<div class="vibe-tags">${vibe.tags.map(t => `<span class="tag">#${t}</span>`).join('')}</div>`
                : ''}
              <div class="vibe-meta">
                <span>${formatDate(vibe.created_at)}</span>
                <div class="vibe-stats">
                  <span class="vibe-stat"><i data-lucide="heart"></i> 0</span>
                  <span class="vibe-stat"><i data-lucide="message-circle"></i> 0</span>
                </div>
              </div>
            </article>
          `).join('')}
        </div>
      `
    }

    // Get vibe preview text
    function getVibePreview(content) {
      if (!content) return 'Empty vibe'
      if (typeof content === 'string') return content.slice(0, 100)
      if (Array.isArray(content)) {
        const first = content[0]
        if (first?.type === 'hero') return first.headline || first.title || 'Vibe'
        if (first?.type === 'markdown') return (first.content || '').slice(0, 100)
        return 'Interactive vibe'
      }
      return 'Vibe content'
    }

    // Switch tab
    async function switchTab(tab) {
      currentTab = tab
      document.querySelectorAll('.tab').forEach(t => {
        t.classList.toggle('active', t.textContent.toLowerCase() === tab)
      })

      const container = document.getElementById('tab-content')
      container.innerHTML = '<div class="loading">Loading...</div>'

      try {
        let vibes
        if (tab === 'vibes') {
          vibes = await api.vibes.getByUser(profileUser.id, { limit: 20 })
        } else {
          vibes = await api.likes.getLikedByUser(profileUser.id, { limit: 20 })
        }
        container.innerHTML = renderVibes(vibes)
        lucide.createIcons()
      } catch (error) {
        container.innerHTML = `<p>Error loading ${tab}: ${error.message}</p>`
      }
    }

    // Toggle follow
    async function toggleFollow() {
      if (!currentUser) {
        window.location.href = 'login'
        return
      }

      const btn = document.getElementById('follow-btn')
      btn.disabled = true

      try {
        if (isFollowing) {
          await api.follows.unfollow(profileUser.id)
          isFollowing = false
          btn.textContent = 'Follow'
          btn.className = 'contrast'
        } else {
          await api.follows.follow(profileUser.id)
          isFollowing = true
          btn.textContent = 'Following'
          btn.className = 'secondary outline'
        }
      } catch (error) {
        alert('Error: ' + error.message)
      } finally {
        btn.disabled = false
      }
    }

    // Show not found
    function showNotFound() {
      document.getElementById('main-content').innerHTML = `
        <div class="not-found">
          <h1>404</h1>
          <p>User not found</p>
          <a href="app" role="button" class="contrast">Go Home</a>
        </div>
      `
    }

    // Update header for logged in user
    function updateHeaderForUser() {
      document.getElementById('header-actions').innerHTML = `
        <a href="app" role="button" class="contrast">Open App</a>
      `
    }

    // Initialize
    async function init() {
      const username = getUsernameFromUrl()

      if (!username) {
        showNotFound()
        return
      }

      // Check if logged in
      const session = await auth.getSession()
      if (session) {
        currentUser = session.user
        updateHeaderForUser()
      }

      // Get profile
      try {
        profileUser = await api.users.getByUsername(username)
        if (!profileUser) {
          showNotFound()
          return
        }
      } catch (error) {
        showNotFound()
        return
      }

      // Check if own profile
      isOwnProfile = currentUser && currentUser.id === profileUser.id

      // Check if following
      if (currentUser && !isOwnProfile) {
        isFollowing = await api.follows.isFollowing(profileUser.id)
      }

      // Get counts and vibes
      const [counts, vibes] = await Promise.all([
        api.follows.getCounts(profileUser.id),
        api.vibes.getByUser(profileUser.id, { limit: 20 })
      ])

      // Update page title
      document.title = `${profileUser.display_name} (@${profileUser.username}) - VibeFeed`

      // Render profile
      renderProfile(profileUser, counts, vibes)
    }

    // Start
    init()
