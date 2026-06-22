// ============================================
// View Loaders
// ============================================

async function loadFeed() {
  const container = document.getElementById('feed-content')
  container.innerHTML = '<div class="loading" style="text-align: center; padding: 2rem; color: var(--pico-muted-color);">Loading feed...</div>'

  try {
    const vibes = await api.vibes.getFeed({ limit: 20 })
    if (vibes.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <i data-lucide="users"></i>
          <h3>Your feed is empty</h3>
          <p>Follow some creators to see their vibes here</p>
          <button class="contrast" onclick="navigate('discover')">Discover Creators</button>
        </div>
      `
      lucide.createIcons()
    } else {
      await renderVibesList(vibes, 'feed-content')
    }
  } catch (error) {
    container.innerHTML = `<p>Error loading feed: ${error.message}</p>`
  }
}

async function loadDiscover() {
  const container = document.getElementById('discover-content')
  container.innerHTML = `
    <div style="margin-bottom: 2rem;">
      <input type="search" id="search-input" placeholder="Search users or tags..."
             onkeyup="if(event.key==='Enter') performSearch()" style="margin-bottom: 0.5rem;">
      <div style="display: flex; gap: 0.5rem;">
        <button class="secondary outline" onclick="performSearch()">
          <i data-lucide="search" style="width: 1rem; height: 1rem;"></i> Search
        </button>
      </div>
    </div>
    <div id="search-results"></div>
    <h3>Trending Tags</h3>
    <div id="trending-tags" style="display: flex; flex-wrap: wrap; gap: 0.5rem; margin-bottom: 2rem;">
      <span style="color: var(--pico-muted-color);">Loading...</span>
    </div>
    <h3>Recent Public Vibes</h3>
    <div id="recent-vibes">
      <div style="text-align: center; padding: 2rem; color: var(--pico-muted-color);">Loading vibes...</div>
    </div>
  `
  lucide.createIcons()

  try {
    const tags = await api.vibes.getTrendingTags(10)
    const tagsContainer = document.getElementById('trending-tags')
    if (tags.length === 0) {
      tagsContainer.innerHTML = '<span style="color: var(--pico-muted-color);">No trending tags yet</span>'
    } else {
      tagsContainer.innerHTML = tags.map(t =>
        `<button class="secondary outline" onclick="searchByTag('${t.tag}')" style="padding: 0.25rem 0.75rem; font-size: 0.875rem;">#${t.tag} <small>(${t.count})</small></button>`
      ).join('')
    }
  } catch (e) {
    document.getElementById('trending-tags').innerHTML = '<span style="color: var(--pico-muted-color);">Error loading tags</span>'
  }

  try {
    const vibes = await api.vibes.getRecent({ limit: 10 })
    if (vibes.length === 0) {
      document.getElementById('recent-vibes').innerHTML = '<span style="color: var(--pico-muted-color);">No public vibes yet</span>'
    } else {
      await renderVibesList(vibes, 'recent-vibes')
    }
  } catch (e) {
    document.getElementById('recent-vibes').innerHTML = '<span style="color: var(--pico-muted-color);">Error loading vibes</span>'
  }
}

async function performSearch() {
  const query = document.getElementById('search-input').value.trim()
  if (!query) return

  const resultsContainer = document.getElementById('search-results')
  resultsContainer.innerHTML = '<p style="color: var(--pico-muted-color);">Searching...</p>'

  try {
    const users = await api.users.search(query, 10)

    let html = ''
    if (users.length > 0) {
      html += '<h4>Users</h4>'
      html += users.map(u => {
        const isOwnProfile = currentUser && currentUser.id === u.id
        const isFollowing = followedUsers.has(u.id)
        return `
          <div class="user-card">
            <div class="user-card-avatar" onclick="window.location.href='profile?u=${u.username}'">
              ${u.avatar_url ? `<img src="${u.avatar_url}" alt="${u.display_name}">` : '<i data-lucide="user" style="width: 1rem; height: 1rem;"></i>'}
            </div>
            <div class="user-card-info" onclick="window.location.href='profile?u=${u.username}'">
              <div class="user-card-name">${u.display_name}</div>
              <div class="user-card-username">@${u.username}</div>
            </div>
            ${!isOwnProfile ? `
              <button class="follow-btn ${isFollowing ? 'following' : 'contrast'}" onclick="event.stopPropagation(); toggleUserFollow('${u.id}', this)">
                ${isFollowing ? 'Following' : 'Follow'}
              </button>
            ` : ''}
          </div>
        `
      }).join('')
    }

    resultsContainer.innerHTML = html

    const tag = query.startsWith('#') ? query.slice(1) : query
    const vibes = await api.vibes.searchByTagPartial(tag, { limit: 10 })
    if (vibes.length > 0) {
      resultsContainer.innerHTML += '<h4>Vibes with matching tags</h4><div id="tag-search-results"></div>'
      await renderVibesList(vibes, 'tag-search-results')
    }

    if (!resultsContainer.innerHTML) {
      resultsContainer.innerHTML = '<p style="color: var(--pico-muted-color);">No results found</p>'
    }

    lucide.createIcons()
  } catch (error) {
    resultsContainer.innerHTML = `<p>Error: ${error.message}</p>`
  }
}

function searchByTag(tag) {
  document.getElementById('search-input').value = '#' + tag
  performSearch()
}

async function loadProfile() {
  const container = document.getElementById('profile-content')
  if (!currentProfile) {
    container.innerHTML = '<p>Loading...</p>'
    return
  }

  try {
    const counts = await api.follows.getCounts(currentUser.id)
    const allVibes = await api.vibes.getByUser(currentUser.id, { limit: 100 })
    const totalVibes = allVibes.length

    container.innerHTML = `
      <article>
        <div style="display: flex; align-items: center; gap: 1.5rem; margin-bottom: 1.5rem;">
          <div class="user-avatar" style="width: 80px; height: 80px;">
            ${currentProfile.avatar_url
              ? `<img src="${currentProfile.avatar_url}" alt="Avatar">`
              : '<i data-lucide="user" style="width: 2rem; height: 2rem;"></i>'}
          </div>
          <div>
            <h2 style="margin: 0;">${currentProfile.display_name}</h2>
            <p style="color: var(--pico-muted-color); margin: 0;">@${currentProfile.username}</p>
          </div>
        </div>
        ${currentProfile.bio ? `<p>${currentProfile.bio}</p>` : ''}
        <div style="display: flex; gap: 2rem; margin-top: 1rem;">
          <div><strong>${counts.followers}</strong> <span style="color: var(--pico-muted-color);">followers</span></div>
          <div><strong>${counts.following}</strong> <span style="color: var(--pico-muted-color);">following</span></div>
          <div><strong>${totalVibes}</strong> <span style="color: var(--pico-muted-color);">vibes</span></div>
        </div>
        <div id="profile-usage-stats" style="margin-top: 1rem; padding-top: 1rem; border-top: 1px solid var(--pico-muted-border-color); font-size: 0.85rem; color: var(--pico-muted-color);">
          Loading usage...
        </div>
      </article>
      <h3>Your Vibes</h3>
      <div id="profile-vibes-container">
        <div style="text-align: center; padding: 2rem; color: var(--pico-muted-color);">Loading vibes...</div>
      </div>
    `
    lucide.createIcons()

    loadProfileUsageStats()
    await loadProfileVibesPage(0, totalVibes)
  } catch (error) {
    container.innerHTML = `<p>Error loading profile: ${error.message}</p>`
  }
}

async function loadProfileUsageStats() {
  const statsEl = document.getElementById('profile-usage-stats')
  if (!statsEl) return

  try {
    const plan = await api.plans.get()
    const postCount = await api.plans.getMonthlyPostCount()
    const isPremium = plan.plan === 'premium'
    const genLimit = plan.monthly_limit || 10
    const genUsed = plan.vibes_used || 0
    const postLimit = api.plans.getMonthlyPostLimit(plan.plan)

    statsEl.innerHTML = `
      <div style="display: flex; gap: 1rem; flex-wrap: wrap;">
        <span>📊 Today: <strong>${genUsed}/${genLimit}</strong> generations</span>
        <span>📅 This month: <strong>${postCount}/${postLimit}</strong> posts</span>
        <span>${isPremium ? '⭐ Premium' : '🆓 Free'}</span>
      </div>
    `
  } catch (e) {
    statsEl.innerHTML = ''
  }
}

async function loadProfileVibesPage(page, totalVibes) {
  const container = document.getElementById('profile-vibes-container')
  if (!container) return

  const offset = page * VIBES_PER_PAGE
  profileVibesPage = page

  container.innerHTML = '<div style="text-align: center; padding: 2rem; color: var(--pico-muted-color);">Loading vibes...</div>'

  try {
    const vibes = await api.vibes.getByUser(currentUser.id, {
      limit: VIBES_PER_PAGE,
      offset: offset
    })

    if (vibes.length === 0 && page === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <i data-lucide="sparkles"></i>
          <h3>No vibes yet</h3>
          <p>Create your first vibe to share with the world</p>
          <a href="create" class="contrast" role="button">Create a Vibe</a>
        </div>
      `
      lucide.createIcons()
      return
    }

    container.innerHTML = '<div id="profile-vibes-list"></div>'
    await renderVibesList(vibes, 'profile-vibes-list')

    const totalPages = Math.ceil(totalVibes / VIBES_PER_PAGE)
    if (totalPages > 1) {
      const pagingHTML = `
        <div class="paging-controls">
          <button class="secondary outline" onclick="loadProfileVibesPage(${page - 1}, ${totalVibes})" ${page === 0 ? 'disabled' : ''}>
            <i data-lucide="chevron-left" style="width: 1rem; height: 1rem;"></i> Previous
          </button>
          <span class="paging-info">Page ${page + 1} of ${totalPages}</span>
          <button class="secondary outline" onclick="loadProfileVibesPage(${page + 1}, ${totalVibes})" ${page >= totalPages - 1 ? 'disabled' : ''}>
            Next <i data-lucide="chevron-right" style="width: 1rem; height: 1rem;"></i>
          </button>
        </div>
      `
      container.insertAdjacentHTML('beforeend', pagingHTML)
      lucide.createIcons()
    }
  } catch (error) {
    container.innerHTML = `<p>Error loading vibes: ${error.message}</p>`
  }
}

async function loadSettings() {
  const container = document.getElementById('settings-content')
  if (!currentProfile) {
    container.innerHTML = '<p>Loading...</p>'
    return
  }

  container.innerHTML = `
    <article>
      <h3>Edit Profile</h3>
      <form id="settings-form" onsubmit="handleSettingsSubmit(event)">
        <label>
          Display Name
          <input type="text" name="display_name" value="${currentProfile.display_name}" required>
        </label>
        <label>
          Bio
          <textarea name="bio" maxlength="160">${currentProfile.bio || ''}</textarea>
        </label>
        <button type="submit" class="contrast">Save Changes</button>
      </form>
    </article>

    <article>
      <h3>Account</h3>
      <p>Email: ${currentUser.email}</p>
      <button class="secondary outline" onclick="handleLogout()">Log Out</button>
    </article>
  `
}

async function handleSettingsSubmit(e) {
  e.preventDefault()
  const form = e.target
  const formData = new FormData(form)

  try {
    await api.users.update({
      display_name: formData.get('display_name'),
      bio: formData.get('bio')
    })
    currentProfile = await api.users.getById(currentUser.id)
    updateUserDisplay()
    alert('Settings saved!')
  } catch (error) {
    alert('Error: ' + error.message)
  }
}

async function loadGuide() {
  const container = document.getElementById('guide-content')
  container.innerHTML = '<p style="color: var(--pico-muted-color);">Loading guide...</p>'

  try {
    const response = await fetch('guide.json')
    const guideData = await response.json()
    const guideBlocks = guideData.pages[0].content

    container.innerHTML = ''

    for (let i = 0; i < guideBlocks.length; i++) {
      const block = guideBlocks[i]
      const blockId = `guide-block-${i}`
      const blockEl = document.createElement('div')
      blockEl.id = blockId
      blockEl.style.marginBottom = '1.5rem'
      container.appendChild(blockEl)

      try {
        await Render.inject(`#${blockId}`, block, { mode: 'replace' })
      } catch (e) {
        console.error('Error rendering guide block:', e)
      }
    }

    const actionsDiv = document.createElement('div')
    actionsDiv.style.cssText = 'display: flex; gap: 1rem; justify-content: center; margin-top: 2rem; flex-wrap: wrap;'
    actionsDiv.innerHTML = `
      <a href="create" class="contrast" role="button" style="display: inline-flex; align-items: center; gap: 0.5rem;">
        <i data-lucide="sparkles" style="width: 1.25rem; height: 1.25rem;"></i>
        Create a Vibe
      </a>
      <button class="secondary" onclick="navigate('discover')" style="display: inline-flex; align-items: center; gap: 0.5rem;">
        <i data-lucide="compass" style="width: 1.25rem; height: 1.25rem;"></i>
        Explore Vibes
      </button>
    `
    container.appendChild(actionsDiv)

    lucide.createIcons()
  } catch (e) {
    console.error('Error loading guide:', e)
    container.innerHTML = '<p style="color: var(--pico-del-color);">Error loading guide</p>'
  }
}

async function loadBilling() {
  const container = document.getElementById('billing-content')
  container.innerHTML = '<p style="color: var(--pico-muted-color);">Loading...</p>'

  try {
    currentPlan = await api.plans.get()
    await api.plans.checkAndResetMonth()
    currentPlan = await api.plans.get()

    const isPremium = currentPlan.plan === 'premium'
    const usagePercent = isPremium ? 0 : Math.round((currentPlan.vibes_used / currentPlan.monthly_limit) * 100)

    container.innerHTML = `
      <article style="border: ${isPremium ? '2px solid #FFD700' : '1px solid var(--pico-muted-border-color)'}; ${isPremium ? 'background: linear-gradient(135deg, rgba(255,215,0,0.1), rgba(255,165,0,0.05));' : ''}">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
          <h3 style="margin: 0;">${isPremium ? '⭐ Premium Plan' : 'Free Plan'}</h3>
          ${isPremium ? '<span class="premium-badge">PRO</span>' : ''}
        </div>

        <div style="margin-bottom: 1rem;">
          <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem;">
            <span>Today's generations</span>
            <span><strong>${currentPlan.vibes_used}</strong> / ${currentPlan.monthly_limit}</span>
          </div>
          <div style="background: var(--pico-muted-border-color); border-radius: 0.5rem; height: 8px; overflow: hidden;">
            <div style="background: ${!isPremium && usagePercent >= 80 ? 'var(--pico-del-color)' : (isPremium ? '#FFD700' : 'var(--pico-primary)')}; height: 100%; width: ${usagePercent}%; transition: width 0.3s;"></div>
          </div>
          ${!isPremium && usagePercent >= 80 ? '<p style="color: var(--pico-del-color); font-size: 0.85rem; margin-top: 0.25rem;">⚠️ Running low on generations today!</p>' : ''}
        </div>
        <div style="margin-bottom: 1rem;">
          <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem;">
            <span>This month's posts</span>
            <span><strong id="monthly-posts-used">...</strong> / <span id="monthly-posts-limit">${isPremium ? 350 : 30}</span></span>
          </div>
          <div style="background: var(--pico-muted-border-color); border-radius: 0.5rem; height: 8px; overflow: hidden;">
            <div id="monthly-posts-bar" style="background: ${isPremium ? '#FFD700' : 'var(--pico-primary)'}; height: 100%; width: 0%; transition: width 0.3s;"></div>
          </div>
        </div>
        ${isPremium ? '<p style="color: var(--pico-muted-color); font-size: 0.9rem;">5 blocks per vibe, p5js enabled</p>' : ''}
      </article>

      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 1rem; margin-top: 1.5rem;">
        <article style="${!isPremium ? 'border: 2px solid var(--pico-primary);' : ''}">
          <h4 style="margin-bottom: 0.5rem;">Free</h4>
          <p style="font-size: 1.5rem; font-weight: 700; margin-bottom: 1rem;">$0<span style="font-size: 0.9rem; font-weight: 400;">/month</span></p>
          <ul style="list-style: none; padding: 0; margin-bottom: 1rem;">
            <li style="padding: 0.25rem 0;"><i data-lucide="check" style="width: 1rem; height: 1rem; color: var(--pico-ins-color); vertical-align: middle;"></i> 10 generations per day</li>
            <li style="padding: 0.25rem 0;"><i data-lucide="check" style="width: 1rem; height: 1rem; color: var(--pico-ins-color); vertical-align: middle;"></i> 30 posts per month</li>
            <li style="padding: 0.25rem 0;"><i data-lucide="check" style="width: 1rem; height: 1rem; color: var(--pico-ins-color); vertical-align: middle;"></i> 2 blocks per vibe</li>
            <li style="padding: 0.25rem 0; color: var(--pico-muted-color);"><i data-lucide="x" style="width: 1rem; height: 1rem; vertical-align: middle;"></i> p5js visualizations</li>
          </ul>
          <button class="secondary outline" ${!isPremium ? 'disabled' : 'onclick="switchPlan(\'free\')"'} style="width: 100%;">
            ${!isPremium ? 'Current Plan' : 'Downgrade'}
          </button>
        </article>

        <article style="border: 2px solid #FFD700; ${isPremium ? 'background: linear-gradient(135deg, rgba(255,215,0,0.1), rgba(255,165,0,0.05));' : ''}">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <h4 style="margin-bottom: 0.5rem;">Premium</h4>
            <span class="premium-badge">PRO</span>
          </div>
          <p style="font-size: 1.5rem; font-weight: 700; margin-bottom: 1rem;">$9<span style="font-size: 0.9rem; font-weight: 400;">/month</span></p>
          <ul style="list-style: none; padding: 0; margin-bottom: 1rem;">
            <li style="padding: 0.25rem 0;"><i data-lucide="check" style="width: 1rem; height: 1rem; color: #FFD700; vertical-align: middle;"></i> <strong>100</strong> generations per day</li>
            <li style="padding: 0.25rem 0;"><i data-lucide="check" style="width: 1rem; height: 1rem; color: #FFD700; vertical-align: middle;"></i> <strong>350</strong> posts per month</li>
            <li style="padding: 0.25rem 0;"><i data-lucide="check" style="width: 1rem; height: 1rem; color: #FFD700; vertical-align: middle;"></i> <strong>5</strong> blocks per vibe</li>
            <li style="padding: 0.25rem 0;"><i data-lucide="check" style="width: 1rem; height: 1rem; color: #FFD700; vertical-align: middle;"></i> p5js & all block types</li>
          </ul>
          <button class="contrast" ${isPremium ? 'disabled' : 'onclick="upgradeToPremium()"'} style="width: 100%; background: linear-gradient(135deg, #FFD700, #FFA500); border: none; color: #1a1a2e; font-weight: 600;">
            ${isPremium ? '✓ Current Plan' : '⭐ Upgrade Now'}
          </button>
        </article>
      </div>

      <p style="text-align: center; margin-top: 1.5rem; color: var(--pico-muted-color); font-size: 0.85rem;">
        Questions? Contact us at <a href="mailto:support@vibefeed.app">support@vibefeed.app</a>
      </p>
    `

    lucide.createIcons()

    try {
      const postCount = await api.plans.getMonthlyPostCount()
      const postLimit = api.plans.getMonthlyPostLimit(currentPlan.plan)
      const postPercent = Math.round((postCount / postLimit) * 100)

      const postsUsedEl = document.getElementById('monthly-posts-used')
      const postsBarEl = document.getElementById('monthly-posts-bar')
      if (postsUsedEl) postsUsedEl.textContent = postCount
      if (postsBarEl) postsBarEl.style.width = `${postPercent}%`
    } catch (e) {
      console.warn('Could not load monthly posts:', e)
    }
  } catch (error) {
    container.innerHTML = `<p style="color: var(--pico-del-color);">Error loading billing: ${error.message}</p>`
  }
}

async function upgradeToPremium() {
  if (confirm('Premium coming soon! For now, this will activate premium features for testing. Continue?')) {
    try {
      const plan = await api.plans.get()
      if (plan._isDefault) {
        await api.plans.create('premium')
      } else {
        await api.plans.setPlan('premium')
      }
      currentPlan = await api.plans.get()
      updatePlanUI()
      alert('🎉 Premium activated! Enjoy unlimited vibes.')
      loadBilling()
    } catch (error) {
      alert('Error: ' + error.message)
    }
  }
}

async function switchPlan(plan) {
  if (plan === 'free' && confirm('Downgrade to free plan? You will lose premium features.')) {
    try {
      await api.plans.setPlan('free')
      currentPlan = await api.plans.get()
      updatePlanUI()
      loadBilling()
    } catch (error) {
      alert('Error: ' + error.message)
    }
  }
}
