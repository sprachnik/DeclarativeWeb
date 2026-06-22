// ============================================
// Supabase Client Configuration
// ============================================

const SUPABASE_URL = 'https://zkqkukfmnkczhhhwqjja.supabase.co'
const SUPABASE_ANON_KEY = 'sb_publishable_6m5YVjANa8PR8iZVjkc_tg_9J6zzM_w'

// Public key is safe to expose in browser
// Secret key (sb_secret_...) goes in Netlify env vars only

// Initialize Supabase client
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

// ============================================
// Auth Helpers
// ============================================

const auth = {
  // Get current session
  async getSession() {
    const { data: { session }, error } = await supabaseClient.auth.getSession()
    if (error) console.error('Error getting session:', error)
    return session
  },

  // Get current user
  async getUser() {
    const { data: { user }, error } = await supabaseClient.auth.getUser()
    // Don't log AuthSessionMissingError - it's expected when logged out
    if (error && error.name !== 'AuthSessionMissingError') {
      console.error('Error getting user:', error)
    }
    return user
  },

  // Sign in with Google
  async signInWithGoogle() {
    const { data, error } = await supabaseClient.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin + '/vibefeed/app'
      }
    })
    if (error) throw error
    return data
  },

  // Sign in with email
  async signInWithEmail(email, password) {
    const { data, error } = await supabaseClient.auth.signInWithPassword({
      email,
      password
    })
    if (error) throw error
    return data
  },

  // Sign up with email
  async signUpWithEmail(email, password) {
    const { data, error } = await supabaseClient.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: window.location.origin + '/vibefeed/app'
      }
    })
    if (error) throw error
    return data
  },

  // Sign out
  async signOut() {
    const { error } = await supabaseClient.auth.signOut()
    if (error) throw error
    window.location.href = '/vibefeed/login'
  },

  // Listen for auth changes
  onAuthStateChange(callback) {
    return supabaseClient.auth.onAuthStateChange((event, session) => {
      callback(event, session)
    })
  }
}

// ============================================
// API Helpers
// ============================================

const api = {
  // ---- USERS ----
  users: {
    // Get user profile by ID
    async getById(id) {
      const { data, error } = await supabaseClient
        .from('users')
        .select('*')
        .eq('id', id)
        .maybeSingle()
      // maybeSingle returns null if not found instead of throwing 406
      if (error) throw error
      return data
    },

    // Get user profile by username
    async getByUsername(username) {
      const { data, error } = await supabaseClient
        .from('users')
        .select('*')
        .eq('username', username)
        .single()
      if (error && error.code !== 'PGRST116') throw error // PGRST116 = not found
      return data
    },

    // Create user profile
    async create(profile) {
      const { data, error } = await supabaseClient
        .from('users')
        .insert(profile)
        .select()
        .single()
      if (error) throw error
      return data
    },

    // Update user profile
    async update(id, updates) {
      const { data, error } = await supabaseClient
        .from('users')
        .update(updates)
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      return data
    },

    // Check if username is available
    async isUsernameAvailable(username) {
      const { data, error } = await supabaseClient
        .rpc('is_username_available', { check_username: username })
      if (error) throw error
      return data
    },

    // Search users by username
    async search(query, limit = 20) {
      const { data, error } = await supabaseClient
        .from('users')
        .select('*')
        .ilike('username', `%${query}%`)
        .limit(limit)
      if (error) throw error
      return data
    }
  },

  // ---- VIBES ----
  vibes: {
    // Get single vibe by ID
    async get(id) {
      const { data, error } = await supabaseClient
        .from('vibes')
        .select(`
          *,
          user:users!vibes_user_id_fkey(id, username, display_name, avatar_url),
          parent:parent_vibe_id(
            id,
            user:users!vibes_user_id_fkey(id, username)
          )
        `)
        .eq('id', id)
        .single()
      if (error) throw error
      return data
    },

    // Create a vibe
    async create({ content, tags, chat_history, parent_vibe_id }) {
      const user = await auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { data, error } = await supabaseClient
        .from('vibes')
        .insert({
          user_id: user.id,
          content,
          tags: tags || [],
          chat_history: chat_history || { messages: [] },
          parent_vibe_id: parent_vibe_id || null
        })
        .select()
        .single()
      if (error) throw error
      return data
    },

    // Delete a vibe
    async delete(id) {
      const { error } = await supabaseClient
        .from('vibes')
        .delete()
        .eq('id', id)
      if (error) throw error
    },

    // Get vibes by user
    async getByUser(userId, { limit = 20, offset = 0, tag = null } = {}) {
      let query = supabaseClient
        .from('vibes')
        .select(`
          *,
          user:users!vibes_user_id_fkey(id, username, display_name, avatar_url)
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1)

      if (tag) {
        query = query.contains('tags', [tag])
      }

      const { data, error } = await query
      if (error) throw error
      return data
    },

    // Get feed (vibes from followed users)
    async getFeed({ limit = 20, offset = 0 } = {}) {
      const user = await auth.getUser()
      if (!user) throw new Error('Not authenticated')

      // Get following IDs
      const { data: followData } = await supabaseClient
        .from('follows')
        .select('following_id')
        .eq('follower_id', user.id)

      const followingIds = followData?.map(f => f.following_id) || []

      if (followingIds.length === 0) {
        return []
      }

      const { data, error } = await supabaseClient
        .from('vibes')
        .select(`
          *,
          user:users!vibes_user_id_fkey(id, username, display_name, avatar_url),
          parent:parent_vibe_id(
            id,
            user:users!vibes_user_id_fkey(id, username)
          )
        `)
        .in('user_id', followingIds)
        .eq('is_public', true)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1)

      if (error) throw error
      return data
    },

    // Search vibes by tag (exact match)
    async searchByTag(tag, { limit = 20, offset = 0 } = {}) {
      let query = supabaseClient
        .from('vibes')
        .select(`
          *,
          user:users!vibes_user_id_fkey(id, username, display_name, avatar_url)
        `)
        .eq('is_public', true)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1)

      if (tag) {
        query = query.contains('tags', [tag])
      }

      const { data, error } = await query
      if (error) throw error
      return data
    },

    // Search vibes by partial tag match
    async searchByTagPartial(searchTerm, { limit = 20 } = {}) {
      // Fetch recent vibes and filter client-side for partial tag match
      const { data, error } = await supabaseClient
        .from('vibes')
        .select(`
          *,
          user:users!vibes_user_id_fkey(id, username, display_name, avatar_url)
        `)
        .eq('is_public', true)
        .order('created_at', { ascending: false })
        .limit(100) // Fetch more to filter

      if (error) throw error

      const term = searchTerm.toLowerCase()
      const filtered = data.filter(vibe =>
        vibe.tags?.some(tag => tag.toLowerCase().includes(term))
      )

      return filtered.slice(0, limit)
    },

    // Get recent public vibes
    async getRecent({ limit = 20, offset = 0 } = {}) {
      const { data, error } = await supabaseClient
        .from('vibes')
        .select(`
          *,
          user:users!vibes_user_id_fkey(id, username, display_name, avatar_url)
        `)
        .eq('is_public', true)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1)
      if (error) throw error
      return data
    },

    // Get trending tags
    async getTrendingTags(limit = 10) {
      // This is a simple implementation - for production,
      // you might want a materialized view or separate table
      const { data, error } = await supabaseClient
        .from('vibes')
        .select('tags')
        .eq('is_public', true)
        .limit(100)

      if (error) throw error

      // Count tags
      const tagCounts = {}
      data.forEach(vibe => {
        (vibe.tags || []).forEach(tag => {
          tagCounts[tag] = (tagCounts[tag] || 0) + 1
        })
      })

      // Sort by count and return top tags
      return Object.entries(tagCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, limit)
        .map(([tag, count]) => ({ tag, count }))
    }
  },

  // ---- FOLLOWS ----
  follows: {
    // Follow a user
    async follow(userId) {
      const user = await auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { error } = await supabaseClient
        .from('follows')
        .insert({
          follower_id: user.id,
          following_id: userId
        })
      if (error) throw error
    },

    // Unfollow a user
    async unfollow(userId) {
      const user = await auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { error } = await supabaseClient
        .from('follows')
        .delete()
        .eq('follower_id', user.id)
        .eq('following_id', userId)
      if (error) throw error
    },

    // Check if following
    async isFollowing(userId) {
      const user = await auth.getUser()
      if (!user) return false

      const { data, error } = await supabaseClient
        .from('follows')
        .select('*')
        .eq('follower_id', user.id)
        .eq('following_id', userId)
        .single()

      if (error && error.code !== 'PGRST116') throw error
      return !!data
    },

    // Get followers
    async getFollowers(userId, { limit = 50, offset = 0 } = {}) {
      const { data, error } = await supabaseClient
        .from('follows')
        .select('follower:follower_id(id, username, display_name, avatar_url)')
        .eq('following_id', userId)
        .range(offset, offset + limit - 1)
      if (error) throw error
      return data.map(f => f.follower)
    },

    // Get following
    async getFollowing(userId, { limit = 50, offset = 0 } = {}) {
      const { data, error } = await supabaseClient
        .from('follows')
        .select('following:following_id(id, username, display_name, avatar_url)')
        .eq('follower_id', userId)
        .range(offset, offset + limit - 1)
      if (error) throw error
      return data.map(f => f.following)
    },

    // Get counts
    async getCounts(userId) {
      const [followers, following] = await Promise.all([
        supabaseClient.rpc('get_follower_count', { user_uuid: userId }),
        supabaseClient.rpc('get_following_count', { user_uuid: userId })
      ])
      return {
        followers: followers.data || 0,
        following: following.data || 0
      }
    }
  },

  // ---- COMMENTS ----
  comments: {
    // Get comments for a vibe
    async list(vibeId, { limit = 50, offset = 0 } = {}) {
      const { data, error } = await supabaseClient
        .from('comments')
        .select(`
          *,
          user:users!comments_user_id_fkey(id, username, display_name, avatar_url)
        `)
        .eq('vibe_id', vibeId)
        .order('created_at', { ascending: true })
        .range(offset, offset + limit - 1)
      if (error) throw error
      return data
    },

    // Create a comment
    async create(vibeId, content) {
      const user = await auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { data, error } = await supabaseClient
        .from('comments')
        .insert({
          vibe_id: vibeId,
          user_id: user.id,
          content
        })
        .select(`
          *,
          user:users!comments_user_id_fkey(id, username, display_name, avatar_url)
        `)
        .single()
      if (error) throw error
      return data
    },

    // Delete a comment
    async delete(id) {
      const { error } = await supabaseClient
        .from('comments')
        .delete()
        .eq('id', id)
      if (error) throw error
    },

    // Get comment count for a vibe
    async count(vibeId) {
      const { count, error } = await supabaseClient
        .from('comments')
        .select('*', { count: 'exact', head: true })
        .eq('vibe_id', vibeId)
      if (error) throw error
      return count
    }
  },

  // ---- LIKES ----
  likes: {
    // Toggle like
    async toggle(vibeId) {
      const user = await auth.getUser()
      if (!user) throw new Error('Not authenticated')

      // Check if already liked
      const { data: existing } = await supabaseClient
        .from('likes')
        .select('*')
        .eq('user_id', user.id)
        .eq('vibe_id', vibeId)
        .maybeSingle()

      if (existing) {
        // Unlike
        await supabaseClient
          .from('likes')
          .delete()
          .eq('user_id', user.id)
          .eq('vibe_id', vibeId)
        return false
      } else {
        // Like
        await supabaseClient
          .from('likes')
          .insert({
            user_id: user.id,
            vibe_id: vibeId
          })
        return true
      }
    },

    // Check if liked
    async isLiked(vibeId) {
      const user = await auth.getUser()
      if (!user) return false

      const { data, error } = await supabaseClient
        .from('likes')
        .select('*')
        .eq('user_id', user.id)
        .eq('vibe_id', vibeId)
        .maybeSingle()

      if (error) throw error
      return !!data
    },

    // Get like count
    async count(vibeId) {
      const { count, error } = await supabaseClient
        .from('likes')
        .select('*', { count: 'exact', head: true })
        .eq('vibe_id', vibeId)
      if (error) throw error
      return count
    },

    // Get liked vibes by user
    async getLikedByUser(userId, { limit = 20, offset = 0 } = {}) {
      const { data, error } = await supabaseClient
        .from('likes')
        .select(`
          vibe:vibes(
            *,
            user:users!vibes_user_id_fkey(id, username, display_name, avatar_url)
          )
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1)
      if (error) throw error
      return data.map(l => l.vibe)
    }
  },

  // ---- NOTIFICATIONS ----
  // Schema:
  // notifications (
  //   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  //   user_id UUID REFERENCES users(id) ON DELETE CASCADE,  -- recipient
  //   actor_id UUID REFERENCES users(id) ON DELETE CASCADE, -- who triggered
  //   type TEXT NOT NULL, -- 'like', 'comment', 'new_post'
  //   vibe_id UUID REFERENCES vibes(id) ON DELETE CASCADE,
  //   read BOOLEAN DEFAULT FALSE,
  //   created_at TIMESTAMPTZ DEFAULT NOW()
  // )
  notifications: {
    // Get notifications for current user
    async list({ limit = 50, unreadOnly = false } = {}) {
      const user = await auth.getUser()
      if (!user) throw new Error('Not authenticated')

      let query = supabaseClient
        .from('notifications')
        .select(`
          *,
          actor:actor_id(id, username, display_name, avatar_url),
          vibe:vibe_id(id, content)
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(limit)

      if (unreadOnly) {
        query = query.eq('read', false)
      }

      const { data, error } = await query
      if (error) throw error
      return data
    },

    // Get unread count
    async unreadCount() {
      const user = await auth.getUser()
      if (!user) return 0

      const { count, error } = await supabaseClient
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('read', false)

      if (error) throw error
      return count || 0
    },

    // Mark notification as read
    async markRead(notificationId) {
      const { error } = await supabaseClient
        .from('notifications')
        .update({ read: true })
        .eq('id', notificationId)
      if (error) throw error
    },

    // Mark all as read
    async markAllRead() {
      const user = await auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { error } = await supabaseClient
        .from('notifications')
        .update({ read: true })
        .eq('user_id', user.id)
        .eq('read', false)
      if (error) throw error
    },

    // Dismiss (delete) a notification
    async dismiss(notificationId) {
      const { error } = await supabaseClient
        .from('notifications')
        .delete()
        .eq('id', notificationId)
      if (error) throw error
    },

    // Create a notification (internal helper)
    async _create({ userId, actorId, type, vibeId }) {
      // Don't notify yourself
      if (userId === actorId) return

      const { error } = await supabaseClient
        .from('notifications')
        .insert({
          user_id: userId,
          actor_id: actorId,
          type,
          vibe_id: vibeId
        })
      // Silently ignore errors (notifications are non-critical)
      if (error) console.warn('Notification error:', error)
    },

    // Notify vibe owner of a like
    async notifyLike(vibeId) {
      const user = await auth.getUser()
      if (!user) return

      // Get vibe owner
      const { data: vibe } = await supabaseClient
        .from('vibes')
        .select('user_id')
        .eq('id', vibeId)
        .single()

      if (vibe && vibe.user_id !== user.id) {
        await this._create({
          userId: vibe.user_id,
          actorId: user.id,
          type: 'like',
          vibeId
        })
      }
    },

    // Notify vibe owner of a comment
    async notifyComment(vibeId) {
      const user = await auth.getUser()
      if (!user) return

      // Get vibe owner
      const { data: vibe } = await supabaseClient
        .from('vibes')
        .select('user_id')
        .eq('id', vibeId)
        .single()

      if (vibe && vibe.user_id !== user.id) {
        await this._create({
          userId: vibe.user_id,
          actorId: user.id,
          type: 'comment',
          vibeId
        })
      }
    },

    // Notify followers of a new post
    async notifyNewPost(vibeId) {
      const user = await auth.getUser()
      if (!user) return

      // Get followers
      const { data: followers } = await supabaseClient
        .from('follows')
        .select('follower_id')
        .eq('following_id', user.id)

      if (!followers || followers.length === 0) return

      // Create notifications for each follower (batch insert)
      const notifications = followers.map(f => ({
        user_id: f.follower_id,
        actor_id: user.id,
        type: 'new_post',
        vibe_id: vibeId
      }))

      const { error } = await supabaseClient
        .from('notifications')
        .insert(notifications)

      if (error) console.warn('Notification error:', error)
    }
  },

  // ---- PLANS (Freemium/Premium) ----
  plans: {
    // Get current user's plan (create default free plan if none exists)
    async get() {
      const user = await auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { data, error } = await supabaseClient
        .from('user_plans')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle()

      if (error) throw error

      // Return existing plan or default free plan
      if (data) return data

      // No plan exists - return default (don't create yet, let onboarding do that)
      return {
        user_id: user.id,
        plan: 'free',
        monthly_limit: 10,
        vibes_used: 0,
        period_start: new Date().toISOString(),
        _isDefault: true // Flag to indicate this is not persisted yet
      }
    },

    // Create a plan for new user (called during onboarding)
    async create(plan = 'free') {
      const user = await auth.getUser()
      if (!user) throw new Error('Not authenticated')

      // Plan limits: free=10, premium=100 generations per day
      const limits = { free: 10, premium: 100 }

      const now = new Date()
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())

      const { data, error } = await supabaseClient
        .from('user_plans')
        .insert({
          user_id: user.id,
          plan: plan,
          monthly_limit: limits[plan] || 10, // Column name is monthly_limit but we use it for daily
          vibes_used: 0,
          period_start: todayStart.toISOString()
        })
        .select()
        .single()

      if (error) throw error
      return data
    },

    // Check and reset if new day (daily limits)
    async checkAndResetPeriod() {
      const user = await auth.getUser()
      if (!user) return

      const { data } = await supabaseClient
        .from('user_plans')
        .select('period_start')
        .eq('user_id', user.id)
        .maybeSingle()

      if (!data) return

      const periodStart = new Date(data.period_start)
      const now = new Date()
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())

      // If period_start is before today, reset
      if (periodStart < todayStart) {
        await supabaseClient
          .from('user_plans')
          .update({
            vibes_used: 0,
            period_start: todayStart.toISOString()
          })
          .eq('user_id', user.id)
      }
    },

    // Legacy alias
    async checkAndResetMonth() {
      return this.checkAndResetPeriod()
    },

    // Check if user can create a vibe
    async canCreateVibe() {
      const plan = await this.get()
      await this.checkAndResetMonth()

      // Premium users have no limit
      if (plan.plan === 'premium') return true

      // Free users: check against monthly limit
      return plan.vibes_used < plan.monthly_limit
    },

    // Get remaining vibes for the month
    async getRemaining() {
      const plan = await this.get()
      if (plan.plan === 'premium') return Infinity
      return Math.max(0, plan.monthly_limit - plan.vibes_used)
    },

    // Increment usage after generating a vibe
    async incrementUsage() {
      const user = await auth.getUser()
      if (!user) return

      // First ensure plan exists and get current usage
      const { data: existing } = await supabaseClient
        .from('user_plans')
        .select('vibes_used')
        .eq('user_id', user.id)
        .maybeSingle()

      if (!existing) {
        // Create default plan first
        await this.create('free')
        return // Plan created with vibes_used = 0, no need to increment
      }

      // Increment vibes_used directly (no RPC needed)
      const current = existing?.vibes_used || 0
      await supabaseClient
        .from('user_plans')
        .update({ vibes_used: current + 1 })
        .eq('user_id', user.id)
    },

    // Get count of vibes posted this month
    async getMonthlyPostCount() {
      const user = await auth.getUser()
      if (!user) return 0

      const now = new Date()
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)

      const { count, error } = await supabaseClient
        .from('vibes')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .gte('created_at', monthStart.toISOString())

      if (error) {
        console.error('Error getting monthly post count:', error)
        return 0
      }
      return count || 0
    },

    // Check if user can post a vibe (monthly limit)
    async canPostVibe() {
      const plan = await this.get()
      const monthlyPostCount = await this.getMonthlyPostCount()

      // Monthly limits: free=30, premium=350
      const monthlyLimits = { free: 30, premium: 350 }
      const limit = monthlyLimits[plan.plan] || 30

      return monthlyPostCount < limit
    },

    // Get monthly post limit for current plan
    getMonthlyPostLimit(plan) {
      const monthlyLimits = { free: 30, premium: 350 }
      return monthlyLimits[plan] || 30
    },

    // Set plan (for admin/testing)
    async setPlan(plan) {
      const user = await auth.getUser()
      if (!user) throw new Error('Not authenticated')

      // Plan limits: free=10, premium=100 generations per day
      const limits = { free: 10, premium: 100 }

      const { data, error } = await supabaseClient
        .from('user_plans')
        .update({
          plan: plan,
          monthly_limit: limits[plan] || 10
        })
        .eq('user_id', user.id)
        .select()
        .single()

      if (error) throw error
      return data
    }
  },

  // ============================================
  // Quiz Completions API
  // ============================================
  quizzes: {
    // Save quiz completion
    async saveCompletion(vibeId, completionData) {
      const user = await auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { data, error } = await supabaseClient
        .from('quiz_completions')
        .insert({
          vibe_id: vibeId,
          user_id: user.id,
          score: completionData.score,
          total_questions: completionData.totalQuestions,
          percentage: completionData.percentage,
          answers: completionData.answers
        })
        .select()
        .single()

      if (error) throw error
      return data
    },

    // Get quiz statistics
    async getStats(vibeId) {
      const { data, error } = await supabaseClient
        .rpc('get_quiz_stats', { vibe_uuid: vibeId })

      if (error) throw error
      return data && data.length > 0 ? data[0] : null
    },

    // Get top scores for a quiz
    async getTopScores(vibeId, limit = 3) {
      const { data, error } = await supabaseClient
        .rpc('get_quiz_top_scores', {
          vibe_uuid: vibeId,
          limit_count: limit
        })

      if (error) throw error
      return data || []
    },

    // Get user's best score for a quiz
    async getUserBestScore(vibeId, userId) {
      const { data, error } = await supabaseClient
        .from('quiz_completions')
        .select('*')
        .eq('vibe_id', vibeId)
        .eq('user_id', userId)
        .order('score', { ascending: false })
        .limit(1)
        .single()

      if (error && error.code !== 'PGRST116') throw error
      return data
    },

    // Get user's first attempt and their rank (for fairness)
    async getUserFirstAttemptRank(vibeId) {
      const user = await auth.getUser()
      if (!user) return null

      // Get user's first attempt (earliest completed_at)
      const { data: userFirstAttempt, error: userError } = await supabaseClient
        .from('quiz_completions')
        .select('*')
        .eq('vibe_id', vibeId)
        .eq('user_id', user.id)
        .order('completed_at', { ascending: true })
        .limit(1)
        .single()

      if (userError && userError.code !== 'PGRST116') {
        console.warn('Error getting user first attempt:', userError)
        return null
      }
      if (!userFirstAttempt) return null

      // Get all first attempts to calculate rank
      // Get earliest attempt per user, then count how many scored higher
      const { data: allFirstAttempts, error: rankError } = await supabaseClient
        .from('quiz_completions')
        .select('user_id, score, completed_at')
        .eq('vibe_id', vibeId)
        .order('user_id', { ascending: true })
        .order('completed_at', { ascending: true })

      if (rankError) {
        console.warn('Error calculating rank:', rankError)
        return { attempt: userFirstAttempt, rank: null, total: null }
      }

      // Get first attempt per user
      const firstAttempts = []
      const seenUsers = new Set()
      for (const attempt of allFirstAttempts) {
        if (!seenUsers.has(attempt.user_id)) {
          firstAttempts.push(attempt)
          seenUsers.add(attempt.user_id)
        }
      }

      // Calculate rank (1-indexed): count how many users scored higher
      const higherScores = firstAttempts.filter(a => a.score > userFirstAttempt.score).length
      const rank = higherScores + 1
      const total = firstAttempts.length

      return {
        attempt: userFirstAttempt,
        rank,
        total
      }
    },

    // Get score distribution (all attempts, non-distinct)
    async getScoreDistribution(vibeId) {
      const { data, error } = await supabaseClient
        .from('quiz_completions')
        .select('score')
        .eq('vibe_id', vibeId)

      if (error) throw error

      // Count frequency of each score
      const distribution = {}
      for (const completion of data) {
        distribution[completion.score] = (distribution[completion.score] || 0) + 1
      }

      return distribution
    },

    // Get all completions for a quiz (for admin/debugging)
    async getAllCompletions(vibeId) {
      const { data, error } = await supabaseClient
        .from('quiz_completions')
        .select(`
          *,
          users (username, display_name)
        `)
        .eq('vibe_id', vibeId)
        .order('completed_at', { ascending: false })

      if (error) throw error
      return data || []
    }
  }
}

// Export for use
window.supabaseClient = supabaseClient
window.auth = auth
window.api = api
