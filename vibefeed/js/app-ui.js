// ============================================
// UI Utility Functions
// ============================================

function formatTime(dateStr) {
  const date = new Date(dateStr)
  const now = new Date()
  const diff = (now - date) / 1000
  if (diff < 60) return 'just now'
  if (diff < 3600) return Math.floor(diff / 60) + 'm'
  if (diff < 86400) return Math.floor(diff / 3600) + 'h'
  if (diff < 604800) return Math.floor(diff / 86400) + 'd'
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function toggleSidebar() {
  document.querySelector('.sidebar').classList.toggle('open')
  document.querySelector('.sidebar-overlay').classList.toggle('show')
}

function closeSidebar() {
  document.querySelector('.sidebar').classList.remove('open')
  document.querySelector('.sidebar-overlay').classList.remove('show')
}

function toggleDropdown() {
  const dropdown = document.getElementById('user-dropdown')
  if (dropdown) dropdown.classList.toggle('show')
}

function closeDropdown() {
  const dropdown = document.getElementById('user-dropdown')
  if (dropdown) dropdown.classList.remove('show')
}

// Close dropdown when clicking outside
document.addEventListener('click', (e) => {
  if (!e.target.closest('.user-menu') && !e.target.closest('#user-dropdown')) {
    closeDropdown()
  }
})

async function handleLogout() {
  await auth.signOut()
  window.location.href = 'login'
}

function updateUserDisplay() {
  document.getElementById('user-name').textContent = currentProfile.display_name
  document.getElementById('user-username').textContent = '@' + currentProfile.username

  const avatarEl = document.getElementById('user-avatar')
  if (currentProfile.avatar_url) {
    avatarEl.innerHTML = `<img src="${currentProfile.avatar_url}" alt="Avatar">`
  }
}

function updatePlanUI() {
  const badge = document.getElementById('plan-badge')
  const banner = document.getElementById('upgrade-banner')

  if (currentPlan) {
    const isPremium = currentPlan.plan === 'premium'

    // Update badge (if element exists)
    if (badge) {
      if (isPremium) {
        badge.textContent = '⭐ Premium'
        badge.classList.add('premium')
      } else {
        badge.textContent = 'Free'
        badge.classList.remove('premium')
      }
    }

    // Update banner (if element exists)
    if (banner) {
      if (isPremium) {
        banner.style.display = 'none'
      } else {
        const dismissed = sessionStorage.getItem('appUpgradeBannerDismissed')
        if (!dismissed) {
          banner.style.display = 'flex'
        }
      }
    }
  }
}

function dismissUpgradeBanner() {
  document.getElementById('upgrade-banner').style.display = 'none'
  sessionStorage.setItem('appUpgradeBannerDismissed', 'true')
}

function showFirstVibeCelebration() {
  const celebration = document.createElement('div')
  celebration.style.cssText = `
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    padding: 3rem;
    border-radius: 2rem;
    box-shadow: 0 20px 60px rgba(102, 126, 234, 0.5);
    z-index: 10000;
    text-align: center;
    max-width: 500px;
    animation: celebrationPop 0.5s cubic-bezier(0.68, -0.55, 0.265, 1.55);
  `
  celebration.innerHTML = `
    <div style="font-size: 4rem; margin-bottom: 1rem;">🎉</div>
    <h2 style="margin: 0 0 1rem 0; font-size: 2rem;">Congratulations!</h2>
    <p style="font-size: 1.2rem; margin: 0 0 1.5rem 0; opacity: 0.95;">You just created your first vibe!</p>
    <p style="font-size: 1rem; margin: 0; opacity: 0.9;">Welcome to the VibeFeed community. Keep creating amazing content!</p>
  `

  const overlay = document.createElement('div')
  overlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.7);
    z-index: 9999;
    animation: fadeIn 0.3s ease;
  `

  const style = document.createElement('style')
  style.textContent = `
    @keyframes celebrationPop {
      0% { transform: translate(-50%, -50%) scale(0); opacity: 0; }
      100% { transform: translate(-50%, -50%) scale(1); opacity: 1; }
    }
    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }
    @keyframes fadeOut {
      from { opacity: 1; }
      to { opacity: 0; }
    }
  `
  document.head.appendChild(style)

  document.body.appendChild(overlay)
  document.body.appendChild(celebration)

  setTimeout(() => {
    celebration.style.animation = 'fadeOut 0.3s ease'
    overlay.style.animation = 'fadeOut 0.3s ease'
    setTimeout(() => {
      celebration.remove()
      overlay.remove()
      style.remove()
    }, 300)
  }, 4000)
}
