/**
 * StateManager - Enhanced reactive state management for Render.js v2
 *
 * Features:
 * - Deep reactive proxy for nested objects/arrays
 * - Infinite loop protection with configurable limits
 * - Render tracking and circular dependency detection
 * - State reset (full and partial)
 * - Change notifications for watchers
 */

const StateManager = (() => {
  class StateManager {
    constructor(initialState = {}, options = {}) {
      // Handle null or non-object initial state
      if (initialState === null || typeof initialState !== 'object') {
        initialState = {}
      }

      // Store deep copy of initial state for reset
      this.initialState = this.deepClone(initialState)

      // Configuration
      this.maxRenders = options.maxRenders || 100
      this.warningThreshold = options.warningThreshold || 10

      // Infinite loop protection
      this.renderCount = 0
      this.renderStack = []
      this.resetTimer = null

      // Change listeners
      this.listeners = []

      // Create reactive state
      this.state = this.createDeepProxy(initialState)
    }

    /**
     * Deep clone an object (handles nested objects and arrays)
     */
    deepClone(obj) {
      if (obj === null || typeof obj !== 'object') {
        return obj
      }

      if (obj instanceof Date) {
        return new Date(obj.getTime())
      }

      if (obj instanceof Array) {
        return obj.map(item => this.deepClone(item))
      }

      const cloned = {}
      for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
          cloned[key] = this.deepClone(obj[key])
        }
      }
      return cloned
    }

    /**
     * Create a deep reactive proxy that handles nested objects/arrays
     */
    createDeepProxy(target, path = []) {
      const self = this

      return new Proxy(target, {
        get(obj, prop) {
          const value = obj[prop]

          // Return proxy for nested objects/arrays
          if (value !== null && typeof value === 'object') {
            return self.createDeepProxy(value, [...path, prop])
          }

          return value
        },

        set(obj, prop, value) {
          const oldValue = obj[prop]

          // Only trigger if value actually changed
          if (oldValue === value) {
            return true
          }

          obj[prop] = value

          // Track this state change
          const fullPath = [...path, prop].join('.')
          self.trackStateChange(fullPath, oldValue, value)

          // Notify listeners
          self.notifyListeners([fullPath])

          return true
        },

        deleteProperty(obj, prop) {
          if (prop in obj) {
            const fullPath = [...path, prop].join('.')
            delete obj[prop]
            self.notifyListeners([fullPath])
          }
          return true
        }
      })
    }

    /**
     * Track state changes for infinite loop detection
     */
    trackStateChange(path, oldValue, newValue) {
      this.renderCount++

      this.renderStack.push({
        path,
        oldValue,
        newValue,
        timestamp: Date.now()
      })

      // Keep stack size manageable
      if (this.renderStack.length > 50) {
        this.renderStack.shift()
      }

      // Warning at threshold
      if (this.renderCount === this.warningThreshold) {
        console.warn('⚠️ Render.js StateManager: Many state updates detected', {
          count: this.renderCount,
          recentChanges: this.renderStack.slice(-5),
          hint: 'Check for circular dependencies in state updates, watch, or actions'
        })
      }

      // Hard limit - prevent infinite loops
      if (this.renderCount >= this.maxRenders) {
        const circularPaths = this.detectCircularDependency()

        console.error('🛑 Render.js StateManager: INFINITE LOOP DETECTED!', {
          totalRenders: this.renderCount,
          likelyCircular: circularPaths,
          recentStack: this.renderStack.slice(-10),
          hint: 'Review watch dependencies and action handlers. State updates may be triggering themselves.'
        })

        // Reset counter to prevent browser freeze
        this.renderCount = 0
        this.renderStack = []

        throw new Error(
          `Maximum render limit (${this.maxRenders}) exceeded. ` +
          `Possible circular dependency in: ${circularPaths.join(', ')}`
        )
      }

      // Auto-reset counter after successful quiet period
      clearTimeout(this.resetTimer)
      this.resetTimer = setTimeout(() => {
        this.renderCount = 0
        this.renderStack = []
      }, 100)
    }

    /**
     * Detect circular dependencies in state updates
     */
    detectCircularDependency() {
      // Count how many times each path was updated recently
      const pathCounts = {}

      this.renderStack.slice(-20).forEach(change => {
        pathCounts[change.path] = (pathCounts[change.path] || 0) + 1
      })

      // Paths updated more than 5 times are likely circular
      return Object.entries(pathCounts)
        .filter(([_, count]) => count > 5)
        .map(([path]) => path)
        .sort((a, b) => pathCounts[b] - pathCounts[a])
    }

    /**
     * Update multiple state properties at once
     */
    setState(updates, source = 'setState') {
      if (!updates || typeof updates !== 'object') {
        throw new Error('setState requires an object of updates')
      }

      const changedPaths = []

      Object.entries(updates).forEach(([key, value]) => {
        if (this.state[key] !== value) {
          this.state[key] = value
          changedPaths.push(key)
        }
      })

      return changedPaths
    }

    /**
     * Reset state to initial values
     */
    reset(keys) {
      if (keys) {
        // Partial reset - specific keys only
        if (!Array.isArray(keys)) {
          keys = [keys]
        }

        keys.forEach(key => {
          if (key in this.initialState) {
            this.state[key] = this.deepClone(this.initialState[key])
          }
        })

        this.notifyListeners(keys)
      } else {
        // Full reset - all state
        const allKeys = Object.keys(this.initialState)

        allKeys.forEach(key => {
          this.state[key] = this.deepClone(this.initialState[key])
        })

        // Remove keys not in initial state
        Object.keys(this.state).forEach(key => {
          if (!(key in this.initialState)) {
            delete this.state[key]
          }
        })

        this.notifyListeners(allKeys)
      }
    }

    /**
     * Add a change listener
     */
    addListener(callback) {
      if (typeof callback !== 'function') {
        throw new Error('Listener must be a function')
      }

      this.listeners.push(callback)

      // Return unsubscribe function
      return () => {
        const index = this.listeners.indexOf(callback)
        if (index > -1) {
          this.listeners.splice(index, 1)
        }
      }
    }

    /**
     * Notify all listeners of state changes
     */
    notifyListeners(changedPaths) {
      this.listeners.forEach(callback => {
        try {
          callback(changedPaths, this.state)
        } catch (error) {
          console.error('Render.js StateManager: Error in state listener:', error)
        }
      })
    }

    /**
     * Get current state (returns proxy)
     */
    getState() {
      return this.state
    }

    /**
     * Get render statistics
     */
    getStats() {
      return {
        renderCount: this.renderCount,
        recentChanges: this.renderStack.slice(-10),
        maxRenders: this.maxRenders,
        warningThreshold: this.warningThreshold
      }
    }
  }

  return StateManager
})()

// Export for Node.js/testing
if (typeof module !== 'undefined' && module.exports) {
  module.exports = StateManager
}
