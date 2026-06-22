/**
 * WatchManager - Watch state changes with debouncing
 *
 * Features:
 * - Watch state paths with callbacks
 * - Default 100ms debounce to prevent race conditions
 * - Configurable debounce per watch
 * - Multiple watchers per path
 * - Unwatch capability
 * - Deep path watching (e.g., 'user.profile.name')
 */

const WatchManager = (() => {
  class WatchManager {
    constructor(stateManager, options = {}) {
      if (!stateManager) {
        throw new Error('WatchManager requires a StateManager instance')
      }

      this.stateManager = stateManager
      this.defaultDebounce = options.defaultDebounce ?? 100 // 100ms default

      // Store watchers by path
      // { 'user.name': [{ id, callback, debounce, timer }] }
      this.watchers = {}

      // Auto-increment ID for each watcher
      this.nextId = 1

      // Listen to all state changes
      this.unsubscribeFromState = stateManager.addListener(
        (changedPaths, state) => this.handleStateChange(changedPaths, state)
      )
    }

    /**
     * Watch a state path for changes
     *
     * @param {string|string[]} paths - Path(s) to watch (e.g., 'user.name' or ['user', 'posts'])
     * @param {Function} callback - Function to call when path changes
     * @param {Object} options - { debounce?: number, immediate?: boolean }
     * @returns {Function} Unwatch function
     */
    watch(paths, callback, options = {}) {
      if (!callback || typeof callback !== 'function') {
        throw new Error('Watch callback must be a function')
      }

      // Normalize to array
      if (!Array.isArray(paths)) {
        paths = [paths]
      }

      // Validate paths
      paths.forEach(path => {
        if (typeof path !== 'string' || path.trim() === '') {
          throw new Error('Watch paths must be non-empty strings')
        }
      })

      // Get debounce setting (per-watch override or default)
      const debounce = options.debounce ?? this.defaultDebounce

      // Create watcher IDs for all paths
      const watcherIds = paths.map(path => {
        const id = this.nextId++

        // Initialize path array if needed
        if (!this.watchers[path]) {
          this.watchers[path] = []
        }

        // Add watcher
        this.watchers[path].push({
          id,
          callback,
          debounce,
          timer: null
        })

        return { path, id }
      })

      // Call immediately if requested
      if (options.immediate) {
        callback(this.stateManager.getState())
      }

      // Return unwatch function
      return () => {
        watcherIds.forEach(({ path, id }) => {
          this.unwatch(path, id)
        })
      }
    }

    /**
     * Remove a watcher
     */
    unwatch(path, watcherId) {
      if (!this.watchers[path]) {
        return
      }

      const index = this.watchers[path].findIndex(w => w.id === watcherId)
      if (index === -1) {
        return
      }

      // Clear any pending timer
      const watcher = this.watchers[path][index]
      if (watcher.timer) {
        clearTimeout(watcher.timer)
      }

      // Remove watcher
      this.watchers[path].splice(index, 1)

      // Clean up empty path arrays
      if (this.watchers[path].length === 0) {
        delete this.watchers[path]
      }
    }

    /**
     * Handle state changes from StateManager
     */
    handleStateChange(changedPaths, state) {
      // Find all watchers that should be triggered
      const triggered = new Set()

      changedPaths.forEach(changedPath => {
        // Check for exact matches
        if (this.watchers[changedPath]) {
          this.watchers[changedPath].forEach(watcher => {
            triggered.add(watcher)
          })
        }

        // Check for parent path matches
        // If 'user.profile.name' changed, trigger 'user' and 'user.profile' watchers
        Object.keys(this.watchers).forEach(watchPath => {
          if (this.isParentPath(watchPath, changedPath)) {
            this.watchers[watchPath].forEach(watcher => {
              triggered.add(watcher)
            })
          }
        })

        // Check for child path matches
        // If 'user' changed, trigger 'user.name', 'user.profile.name' watchers
        Object.keys(this.watchers).forEach(watchPath => {
          if (this.isChildPath(watchPath, changedPath)) {
            this.watchers[watchPath].forEach(watcher => {
              triggered.add(watcher)
            })
          }
        })
      })

      // Execute watchers with debouncing
      triggered.forEach(watcher => {
        this.executeWatcher(watcher, state)
      })
    }

    /**
     * Check if watchPath is a parent of changedPath
     * Example: 'user' is parent of 'user.profile.name'
     */
    isParentPath(watchPath, changedPath) {
      return changedPath.startsWith(watchPath + '.')
    }

    /**
     * Check if watchPath is a child of changedPath
     * Example: 'user.name' is child of 'user'
     */
    isChildPath(watchPath, changedPath) {
      return watchPath.startsWith(changedPath + '.')
    }

    /**
     * Execute a watcher with debouncing
     */
    executeWatcher(watcher, state) {
      // Clear existing timer
      if (watcher.timer) {
        clearTimeout(watcher.timer)
      }

      // No debounce - execute immediately
      if (watcher.debounce === 0) {
        try {
          watcher.callback(state)
        } catch (error) {
          console.error('Render.js WatchManager: Error in watch callback:', error)
        }
        return
      }

      // Debounced execution
      watcher.timer = setTimeout(() => {
        watcher.timer = null

        try {
          watcher.callback(state)
        } catch (error) {
          console.error('Render.js WatchManager: Error in watch callback:', error)
        }
      }, watcher.debounce)
    }

    /**
     * Clear all watchers
     */
    clearAll() {
      // Clear all timers
      Object.values(this.watchers).forEach(watcherArray => {
        watcherArray.forEach(watcher => {
          if (watcher.timer) {
            clearTimeout(watcher.timer)
          }
        })
      })

      // Clear watchers
      this.watchers = {}
    }

    /**
     * Get count of active watchers
     */
    getWatcherCount() {
      return Object.values(this.watchers).reduce(
        (sum, arr) => sum + arr.length,
        0
      )
    }

    /**
     * Get all watched paths
     */
    getWatchedPaths() {
      return Object.keys(this.watchers)
    }

    /**
     * Destroy and cleanup
     */
    destroy() {
      this.clearAll()

      if (this.unsubscribeFromState) {
        this.unsubscribeFromState()
      }
    }
  }

  return WatchManager
})()

// Export for Node.js/testing
if (typeof module !== 'undefined' && module.exports) {
  module.exports = WatchManager
}
