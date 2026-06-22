// ============================================
// Navigation
// ============================================

function navigate(view) {
  currentView = view

  // Update active nav item
  document.querySelectorAll('.nav-item').forEach(item => {
    item.classList.remove('active')
    if (item.dataset.view === view) {
      item.classList.add('active')
    }
  })

  // Show active view
  document.querySelectorAll('.view').forEach(v => {
    v.classList.remove('active')
  })
  document.getElementById(`view-${view}`).classList.add('active')

  // Close mobile sidebar
  closeSidebar()

  // Load view content
  loadViewContent(view)
}

async function loadViewContent(view) {
  switch (view) {
    case 'feed':
      await loadFeed()
      break
    case 'discover':
      await loadDiscover()
      break
    case 'profile':
      await loadProfile()
      break
    case 'settings':
      await loadSettings()
      break
    case 'guide':
      await loadGuide()
      break
    case 'billing':
      await loadBilling()
      break
  }
}
