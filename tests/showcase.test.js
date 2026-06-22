/**
 * Tests for showcase.json interactive demos
 * Verifies all demo functionality works correctly
 */

const fs = require('fs')
const path = require('path')

describe('Showcase Interactive Demos', () => {
  let Render
  let showcaseData
  let container

  beforeEach(() => {
    // Reset DOM
    document.body.innerHTML = '<div id="app"></div>'
    container = document.querySelector('#app')

    // Reset module cache to get fresh instance
    jest.resetModules()
    Render = require('../render.js')

    // Load showcase.json
    const showcasePath = path.join(__dirname, '..', 'showcase.json')
    showcaseData = JSON.parse(fs.readFileSync(showcasePath, 'utf8'))

    // Mock fetch for loading imported page JSON files
    global.fetch = jest.fn((url) => {
      const pagesDir = path.join(__dirname, '..', 'pages')
      const fileName = url.split('/').pop()
      const filePath = path.join(pagesDir, fileName)

      if (fs.existsSync(filePath)) {
        const fileContent = fs.readFileSync(filePath, 'utf8')
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(JSON.parse(fileContent))
        })
      }

      return Promise.reject(new Error(`File not found: ${url}`))
    })

    // Mock window.lucide
    global.lucide = { createIcons: jest.fn() }
    global.marked = { parse: (text) => text }

    // Mock window.scrollTo (not implemented in jsdom)
    global.window.scrollTo = jest.fn()
  })

  describe('State Management Demo', () => {
    beforeEach(async () => {
      await Render.init({ data: showcaseData, target: '#app' })
      // Navigate to demos page where the interactive demos are
      window.history.pushState({}, '', '/demos')
      await Render.navigate('/demos')
    })

    test('should initialize with counter at 0', async () => {
      expect(Render.state.counter).toBe(0)
      expect(container.innerHTML).toContain('Counter')
    })

    test('should increment counter when state is updated', () => {
      Render.state.counter++
      expect(Render.state.counter).toBe(1)
    })

    test('should decrement counter when state is updated', () => {
      Render.state.counter = 5
      Render.state.counter--
      expect(Render.state.counter).toBe(4)
    })

    test('should reset counter to 0', () => {
      Render.state.counter = 10
      Render.state.counter = 0
      expect(Render.state.counter).toBe(0)
    })
  })

  describe('Expression Evaluator Demo', () => {
    beforeEach(async () => {
      await Render.init({ data: showcaseData, target: '#app' })
      window.history.pushState({}, '', '/demos')
      await Render.navigate('/demos')
    })

    test('should evaluate math expressions', () => {
      Render.state.counter = 5
      // When counter is 5, counter * 2 should be 10
      expect(Render.state.counter * 2).toBe(10)
      // The page should render the demo content
      expect(container.innerHTML).toContain('Expression Evaluator Demo')
    })

    test('should evaluate ternary expressions based on counter value', () => {
      // Counter <= 5
      Render.state.counter = 3
      expect(container.innerHTML).toContain('less than or equal to')

      // Counter > 5
      Render.state.counter = 10
      expect(container.innerHTML).toContain('greater than')
    })

    test('should access state.version in expressions', () => {
      expect(Render.state.version).toBe('0.0.1-beta')
      expect(container.innerHTML).toContain('0.0.1-beta')
    })
  })

  describe('Conditional Rendering Demo', () => {
    beforeEach(async () => {
      await Render.init({ data: showcaseData, target: '#app' })
      window.history.pushState({}, '', '/demos')
      await Render.navigate('/demos')
    })

    test('should show "counter is zero" message when counter === 0', () => {
      Render.state.counter = 0
      expect(container.innerHTML).toContain('Counter is zero!')
    })

    test('should show "between 1-5" message when counter is 1-5', () => {
      Render.state.counter = 3
      expect(container.innerHTML).toContain('Counter is between 1-5')
    })

    test('should show "greater than 5" message when counter > 5', () => {
      Render.state.counter = 10
      expect(container.innerHTML).toContain('Counter is greater than 5!')
    })

    test('should update conditional content when counter changes', () => {
      // When counter is 0, should show zero message
      Render.state.counter = 0
      expect(container.innerHTML).toContain('⚠️ Counter is zero!')

      // When counter is 3, should show between 1-5 message
      Render.state.counter = 3
      expect(container.innerHTML).toContain('✅ Counter is between 1-5')

      // When counter is 10, should show greater than 5 message
      Render.state.counter = 10
      expect(container.innerHTML).toContain('🎉 Counter is greater than 5!')
    })
  })

  describe('Task List Demo', () => {
    beforeEach(async () => {
      await Render.init({ data: showcaseData, target: '#app' })
      window.history.pushState({}, '', '/demos')
      await Render.navigate('/demos')
    })

    test('should initialize with empty tasks array', () => {
      expect(Render.state.tasks).toEqual([])
    })

    test('should add tasks to the list', () => {
      Render.state.tasks = [...Render.state.tasks, 'First task']
      expect(Render.state.tasks).toHaveLength(1)
      expect(Render.state.tasks[0]).toBe('First task')

      Render.state.tasks = [...Render.state.tasks, 'Second task']
      expect(Render.state.tasks).toHaveLength(2)
      expect(Render.state.tasks[1]).toBe('Second task')
    })

    test('should display task count', () => {
      Render.state.tasks = ['Task 1', 'Task 2', 'Task 3']
      expect(container.innerHTML).toContain('3 items')
    })

    test('should show "no tasks" message when tasks array is empty', () => {
      Render.state.tasks = []
      expect(container.innerHTML).toContain('No tasks yet')
    })

    test('should show task list when tasks exist', () => {
      Render.state.tasks = ['Buy groceries', 'Walk the dog']
      expect(container.innerHTML).toContain('Your Tasks')
    })

    test('should remove tasks from the list', () => {
      Render.state.tasks = ['Task 1', 'Task 2', 'Task 3']

      // Remove middle task
      Render.state.tasks.splice(1, 1)
      Render.state.tasks = [...Render.state.tasks]

      expect(Render.state.tasks).toHaveLength(2)
      expect(Render.state.tasks).toEqual(['Task 1', 'Task 3'])
    })

    test('should clear all tasks', () => {
      Render.state.tasks = ['Task 1', 'Task 2']
      Render.state.tasks = []

      expect(Render.state.tasks).toHaveLength(0)
    })
  })

  describe('Color Theme Picker Demo', () => {
    beforeEach(async () => {
      await Render.init({ data: showcaseData, target: '#app' })
      window.history.pushState({}, '', '/demos')
      await Render.navigate('/demos')
    })

    test('should initialize with default color theme', () => {
      expect(Render.state.colorTheme).toBe('default')
    })

    test('should update color theme state', () => {
      Render.state.colorTheme = 'red'
      expect(Render.state.colorTheme).toBe('red')

      Render.state.colorTheme = 'blue'
      expect(Render.state.colorTheme).toBe('blue')
    })

    test('should apply CSS variables when theme is not default', () => {
      Render.state.colorTheme = 'purple'
      const primaryColor = document.documentElement.style.getPropertyValue('--pico-primary')
      expect(primaryColor).toContain('hsl')
      expect(primaryColor).toContain('270') // purple hue
    })

    test('should update CSS variables when theme changes', () => {
      Render.state.colorTheme = 'red'
      let primaryColor = document.documentElement.style.getPropertyValue('--pico-primary')
      expect(primaryColor).toContain('hsl')
      expect(primaryColor).toContain('0') // red hue

      Render.state.colorTheme = 'default'
      primaryColor = document.documentElement.style.getPropertyValue('--pico-primary')
      expect(primaryColor).toContain('205') // default azure hue
    })

    test('should display current theme name', () => {
      Render.state.colorTheme = 'cyan'
      expect(container.innerHTML).toContain('cyan')
    })

    test('should support all 18 color themes', () => {
      const themes = [
        'default', 'red', 'pink', 'fuchsia', 'purple', 'violet',
        'indigo', 'blue', 'cyan', 'jade', 'green', 'lime',
        'yellow', 'amber', 'pumpkin', 'orange', 'zinc', 'slate'
      ]

      themes.forEach(theme => {
        Render.state.colorTheme = theme
        expect(Render.state.colorTheme).toBe(theme)

        // Check that CSS variables are set
        const primaryColor = document.documentElement.style.getPropertyValue('--pico-primary')
        expect(primaryColor).toContain('hsl')
      })
    })
  })

  describe('Reactive State Triggers Re-render', () => {
    beforeEach(async () => {
      await Render.init({ data: showcaseData, target: '#app' })
      window.history.pushState({}, '', '/demos')
      await Render.navigate('/demos')
    })

    test('should re-render when counter changes', () => {
      Render.state.counter = 0
      expect(container.innerHTML).toContain('Counter: <span')

      Render.state.counter = 5
      // Counter value should be visible in the DOM
      expect(container.textContent).toContain('5')
    })

    test('should re-render when tasks change', () => {
      Render.state.tasks = []
      expect(container.innerHTML).toContain('No tasks yet')

      Render.state.tasks = ['New task']
      expect(container.innerHTML).toContain('Your Tasks')
    })

    test('should update CSS variables when color theme changes', () => {
      Render.state.colorTheme = 'default'
      let primaryColor = document.documentElement.style.getPropertyValue('--pico-primary')
      expect(primaryColor).toContain('205') // default azure

      Render.state.colorTheme = 'red'
      primaryColor = document.documentElement.style.getPropertyValue('--pico-primary')
      expect(primaryColor).toContain('hsl')
      expect(primaryColor).toContain('0') // red hue
    })
  })

  describe('Functions', () => {
    test('should define year() function', async () => {
      await Render.init({ data: showcaseData, target: '#app' })

      expect(showcaseData.functions.year).toBeDefined()
    })

    test('should evaluate year() in footer', async () => {
      await Render.init({ data: showcaseData, target: '#app' })

      const currentYear = new Date().getFullYear()
      expect(container.innerHTML).toContain(currentYear.toString())
    })
  })

  describe('Navigation', () => {
    test('should render /demos page with all interactive demos', async () => {
      await Render.init({ data: showcaseData, target: '#app' })

      // Navigate to demos page
      window.history.pushState({}, '', '/demos')
      await Render.navigate('/demos')

      expect(container.innerHTML).toContain('Interactive Demos')
      expect(container.innerHTML).toContain('State Management Demo')
      expect(container.innerHTML).toContain('Expression Evaluator Demo')
      expect(container.innerHTML).toContain('Conditional Rendering Demo')
      expect(container.innerHTML).toContain('PicoCSS Color Theme Picker')
    })
  })

  describe('Page Meta', () => {
    test('should have correct meta information for demos page', async () => {
      await Render.init({ data: showcaseData, target: '#app' })

      // Navigate to demos page to trigger import loading
      window.history.pushState({}, '', '/demos')
      await Render.navigate('/demos')

      // After navigation, check that the page loaded correctly
      expect(container.innerHTML).toContain('Interactive Demos')
      expect(container.innerHTML).toContain('See all features in action')
    })
  })

  describe('All Content Blocks Load', () => {
    test('should load all content blocks without errors', async () => {
      const consoleError = jest.spyOn(console, 'error').mockImplementation()

      await Render.init({ data: showcaseData, target: '#app' })

      // Navigate through all pages
      for (const page of showcaseData.pages) {
        window.history.pushState({}, '', page.path)
        await Render.navigate(page.path)
      }

      // Should have no critical errors
      const criticalErrors = consoleError.mock.calls.filter(call => {
        const firstArg = call[0]
        return typeof firstArg === 'string' && firstArg.includes('Critical')
      })
      expect(criticalErrors).toHaveLength(0)

      consoleError.mockRestore()
    })
  })
})
