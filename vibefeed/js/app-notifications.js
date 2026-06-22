// ============================================
// Notifications
// ============================================

async function loadNotifications() {
  try {
    notifications = await api.notifications.list({ limit: 50 })
    updateNotificationBadge()
    renderNotifications()
  } catch (e) {
    console.log('Could not load notifications:', e)
  }
}

function updateNotificationBadge() {
  const badge = document.getElementById('notification-badge')
  const actionsEl = document.getElementById('notification-actions')
  const unreadCount = notifications.filter(n => !n.read).length
  if (unreadCount > 0) {
    badge.textContent = unreadCount > 99 ? '99+' : unreadCount
    badge.style.display = 'block'
    if (actionsEl) actionsEl.style.display = 'flex'
  } else {
    badge.style.display = 'none'
    if (actionsEl) actionsEl.style.display = 'none'
  }
}

function renderNotifications() {
  const container = document.getElementById('notification-list')

  if (notifications.length === 0) {
    container.innerHTML = `
      <div class="notification-empty">
        <i data-lucide="bell-off"></i>
        <p>No notifications yet</p>
      </div>
    `
    lucide.createIcons()
    return
  }

  container.innerHTML = notifications.map(n => {
    const actor = n.actor || {}
    const avatarHtml = actor.avatar_url
      ? `<img src="${actor.avatar_url}" alt="${actor.display_name}">`
      : `<i data-lucide="user"></i>`

    let message = ''
    let icon = ''
    switch (n.type) {
      case 'like':
        message = `<strong>${actor.display_name || actor.username}</strong> liked your vibe`
        icon = 'heart'
        break
      case 'comment':
        message = `<strong>${actor.display_name || actor.username}</strong> commented on your vibe`
        icon = 'message-circle'
        break
      case 'new_post':
        message = `<strong>${actor.display_name || actor.username}</strong> posted a new vibe`
        icon = 'sparkles'
        break
      default:
        message = `<strong>${actor.display_name || actor.username}</strong> interacted with you`
        icon = 'bell'
    }

    return `
      <div class="notification-item ${n.read ? '' : 'unread'}"
           data-id="${n.id}"
           data-vibe-id="${n.vibe_id}"
           onclick="handleNotificationClick('${n.id}', '${n.vibe_id}')">
        <div class="notification-avatar">
          ${avatarHtml}
        </div>
        <div class="notification-content">
          <div class="notification-text">
            <i data-lucide="${icon}" style="width: 0.875rem; height: 0.875rem; vertical-align: -2px; margin-right: 0.25rem;"></i>
            ${message}
          </div>
          <div class="notification-time">${formatTime(n.created_at)}</div>
        </div>
        <button class="notification-dismiss" onclick="dismissNotification(event, '${n.id}')" title="Dismiss">
          <i data-lucide="x"></i>
        </button>
      </div>
    `
  }).join('')

  lucide.createIcons()
}

function toggleNotifications() {
  const panel = document.getElementById('notification-panel')
  const overlay = document.getElementById('notification-overlay')
  const isOpen = panel.classList.contains('open')

  if (isOpen) {
    closeNotifications()
  } else {
    panel.classList.add('open')
    overlay.classList.add('show')
    loadNotifications()
  }
}

function closeNotifications() {
  document.getElementById('notification-panel').classList.remove('open')
  document.getElementById('notification-overlay').classList.remove('show')
}

async function handleNotificationClick(notificationId, vibeId) {
  try {
    await api.notifications.markRead(notificationId)
    const notification = notifications.find(n => n.id === notificationId)
    if (notification) notification.read = true
    updateNotificationBadge()
    renderNotifications()
  } catch (e) {
    console.error('Error marking notification read:', e)
  }

  closeNotifications()
  window.location.href = `vibe?id=${vibeId}`
}

async function dismissNotification(event, notificationId) {
  event.stopPropagation()
  try {
    await api.notifications.dismiss(notificationId)
    notifications = notifications.filter(n => n.id !== notificationId)
    updateNotificationBadge()
    renderNotifications()
  } catch (e) {
    console.error('Error dismissing notification:', e)
  }
}

async function markAllNotificationsRead() {
  try {
    await api.notifications.markAllRead()
    notifications.forEach(n => n.read = true)
    updateNotificationBadge()
    renderNotifications()
  } catch (e) {
    console.error('Error marking all read:', e)
  }
}
