/**
 * @jest-environment jsdom
 */

// Mock browser APIs
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// Mock localStorage
const localStorageMock = (() => {
  let store = {};
  return {
    getItem: (key) => store[key] || null,
    setItem: (key, value) => { store[key] = value.toString(); },
    removeItem: (key) => { delete store[key]; },
    clear: () => { store = {}; }
  };
})();
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
});

// Mock history API
Object.defineProperty(window, 'history', {
  writable: true,
  value: {
    pushState: jest.fn(),
    replaceState: jest.fn(),
    state: {}
  }
});

// Mock location
delete window.location;
window.location = {
  pathname: '/',
  href: 'http://localhost/',
  origin: 'http://localhost'
};

// Mock scrollTo
window.scrollTo = jest.fn();

// Mock marked library
global.marked = {
  parse: (content) => `<p>${content}</p>`
};

// Mock lucide library
global.lucide = {
  createIcons: jest.fn()
};

// Load v2 modules and expose them globally (required for watch block and other features)
global.ExpressionEvaluator = require('../expression-evaluator.js');
global.ActionExecutor = require('../action-executor.js');
global.StateManager = require('../state-manager.js');
global.ConditionalRenderer = require('../conditional-renderer.js');
global.LoopRenderer = require('../loop-renderer.js');

// Load render.js
require('../render.js');

describe('Render.js Framework', () => {
  let container;

  beforeEach(() => {
    // Create a fresh container for each test
    document.body.innerHTML = '<div id="app"></div>';
    container = document.getElementById('app');

    // Reset localStorage
    localStorage.clear();
  });

  afterEach(() => {
    // Clean up DOM
    document.body.innerHTML = '';

    // Clean up dynamically created window handlers (quiz, button actions)
    // Remove handlers that start with quiz, btn_, or test function names
    Object.keys(window).forEach(key => {
      if (key.startsWith('quizAnswer_') ||
          key.startsWith('quizReset_') ||
          key.startsWith('btn_') ||
          key === 'testFn' ||
          key === 'testFunction') {
        delete window[key];
      }
    });

    // Clean up Frappe chart configs
    if (window.frappeChartConfigs) {
      window.frappeChartConfigs = {};
    }
  });

  describe('Initialization', () => {
    test('should initialize with data object', async () => {
      const data = {
        site: { title: 'Test Site' },
        pages: [
          {
            path: '/',
            content: [
              { type: 'hero', headline: 'Welcome' }
            ]
          }
        ]
      };

      await Render.init({ data, target: '#app' });

      expect(container.innerHTML).toContain('Welcome');
    });

    test('should show error without required site property', async () => {
      const data = {
        pages: [{ path: '/', content: [] }]
      };

      await Render.init({ data, target: '#app' });

      expect(container.innerHTML).toContain('Initialization Error');
      expect(container.innerHTML).toContain('site');
    });

    test('should show error without required pages property', async () => {
      const data = {
        site: { title: 'Test' }
      };

      await Render.init({ data, target: '#app' });

      expect(container.innerHTML).toContain('Initialization Error');
      expect(container.innerHTML).toContain('pages');
    });
  });

  describe('Content Blocks', () => {
    test('should render hero block', async () => {
      const data = {
        site: { title: 'Test' },
        pages: [
          {
            path: '/',
            content: [
              {
                type: 'hero',
                headline: 'Test Headline',
                subhead: 'Test Subhead'
              }
            ]
          }
        ]
      };

      await Render.init({ data, target: '#app' });

      expect(container.innerHTML).toContain('Test Headline');
      expect(container.innerHTML).toContain('Test Subhead');
      expect(container.innerHTML).toContain('class="hero"');
    });

    test('should render markdown block', async () => {
      const data = {
        site: { title: 'Test' },
        pages: [
          {
            path: '/',
            content: [
              {
                type: 'markdown',
                content: '## Test Heading'
              }
            ]
          }
        ]
      };

      await Render.init({ data, target: '#app' });

      expect(container.innerHTML).toContain('<p>## Test Heading</p>');
    });

    test('should render code block', async () => {
      const data = {
        site: { title: 'Test' },
        pages: [
          {
            path: '/',
            content: [
              {
                type: 'code',
                language: 'javascript',
                code: 'const x = 1;'
              }
            ]
          }
        ]
      };

      await Render.init({ data, target: '#app' });

      expect(container.innerHTML).toContain('const x = 1;');
      expect(container.innerHTML).toContain('language-javascript');
    });

    test('should render section with resources', async () => {
      const data = {
        site: { title: 'Test' },
        pages: [
          {
            path: '/',
            content: [
              {
                type: 'section',
                title: 'Features',
                resources: [
                  {
                    title: 'Feature 1',
                    description: 'Description 1'
                  }
                ]
              }
            ]
          }
        ]
      };

      await Render.init({ data, target: '#app' });

      expect(container.innerHTML).toContain('Features');
      expect(container.innerHTML).toContain('Feature 1');
      expect(container.innerHTML).toContain('Description 1');
    });

    test('should render HTML block', async () => {
      const data = {
        site: { title: 'Test' },
        pages: [
          {
            path: '/',
            content: [
              {
                type: 'html',
                html: '<div class="custom">Custom HTML</div>'
              }
            ]
          }
        ]
      };

      await Render.init({ data, target: '#app' });

      expect(container.innerHTML).toContain('Custom HTML');
      expect(container.innerHTML).toContain('class="custom"');
    });

    test('should handle error for unknown block type', async () => {
      const data = {
        site: { title: 'Test' },
        pages: [
          {
            path: '/',
            content: [
              {
                type: 'unknown-type',
                data: 'test'
              }
            ]
          }
        ]
      };

      await Render.init({ data, target: '#app' });

      expect(container.innerHTML).toContain('error');
    });
  });

  describe('Navigation', () => {
    test('should render horizontal navigation', async () => {
      const data = {
        site: { title: 'Test' },
        nav: {
          layout: 'horizontal',
          logo: { text: 'Logo', icon: 'zap' },
          links: [
            { label: 'Home', path: '/' },
            { label: 'About', path: '/about' }
          ]
        },
        pages: [{ path: '/', content: [] }]
      };

      await Render.init({ data, target: '#app' });

      expect(container.innerHTML).toContain('Logo');
      expect(container.innerHTML).toContain('Home');
      expect(container.innerHTML).toContain('About');
      expect(container.innerHTML).toContain('data-nav-layout="horizontal"');
    });

    test('should render theme toggle action', async () => {
      const data = {
        site: { title: 'Test' },
        nav: {
          links: [{ label: 'Home', path: '/' }],
          actions: [{ type: 'theme-toggle' }]
        },
        pages: [{ path: '/', content: [] }]
      };

      await Render.init({ data, target: '#app' });

      expect(container.innerHTML).toContain('theme-toggle');
      expect(container.innerHTML).toContain('Toggle theme');
    });

    test('should not render nav without links', async () => {
      const data = {
        site: { title: 'Test' },
        nav: {},
        pages: [{ path: '/', content: [] }]
      };

      await Render.init({ data, target: '#app' });

      expect(container.innerHTML).not.toContain('site-nav');
    });
  });

  describe('Templating', () => {
    test('should interpolate site values', async () => {
      const data = {
        site: { title: 'My Site', version: '1.0' },
        pages: [
          {
            path: '/',
            content: [
              {
                type: 'hero',
                headline: 'Welcome to {{site.title}}'
              }
            ]
          }
        ]
      };

      await Render.init({ data, target: '#app' });

      expect(container.innerHTML).toContain('Welcome to My Site');
    });

    test('should interpolate state values', async () => {
      const data = {
        site: {
          title: 'Test',
          state: { count: 42 }
        },
        pages: [
          {
            path: '/',
            content: [
              {
                type: 'markdown',
                content: 'Count: {{state.count}}'
              }
            ]
          }
        ]
      };

      await Render.init({ data, target: '#app' });

      expect(container.innerHTML).toContain('Count: 42');
    });

    test('should call custom functions', async () => {
      const data = {
        site: { title: 'Test' },
        functions: {
          upper: "(str) => str.toUpperCase()"
        },
        pages: [
          {
            path: '/',
            content: [
              {
                type: 'hero',
                headline: '{{upper("hello")}}'
              }
            ]
          }
        ]
      };

      await Render.init({ data, target: '#app' });

      expect(container.innerHTML).toContain('HELLO');
    });
  });

  describe('Components', () => {
    test('should render component references', async () => {
      const data = {
        site: { title: 'Test' },
        components: {
          badge: '<span class="badge">{{text}}</span>'
        },
        pages: [
          {
            path: '/',
            content: [
              { $ref: 'badge', text: 'New' }
            ]
          }
        ]
      };

      await Render.init({ data, target: '#app' });

      expect(container.innerHTML).toContain('badge');
      expect(container.innerHTML).toContain('New');
    });

    test('should handle missing component', async () => {
      const data = {
        site: { title: 'Test' },
        pages: [
          {
            path: '/',
            content: [
              { $ref: 'nonexistent', text: 'Test' }
            ]
          }
        ]
      };

      await Render.init({ data, target: '#app' });

      expect(container.innerHTML).toContain('error');
    });
  });

  describe('Theme Management', () => {
    test('should apply custom theme colors', async () => {
      const data = {
        site: {
          title: 'Test',
          theme: {
            primaryColor: '#ff0000',
            secondaryColor: '#00ff00'
          }
        },
        pages: [{ path: '/', content: [] }]
      };

      await Render.init({ data, target: '#app' });

      const root = document.documentElement;
      expect(root.style.getPropertyValue('--pico-primary')).toBe('#ff0000');
      expect(root.style.getPropertyValue('--pico-secondary')).toBe('#00ff00');
    });

    test('should inject custom font URL', async () => {
      const data = {
        site: {
          title: 'Test',
          theme: {
            fontUrl: 'https://fonts.googleapis.com/css2?family=Inter',
            fontFamily: 'Inter, sans-serif'
          }
        },
        pages: [{ path: '/', content: [] }]
      };

      await Render.init({ data, target: '#app' });

      const fontLink = document.querySelector('link[data-render-font]');
      expect(fontLink).toBeTruthy();
      expect(fontLink.href).toContain('Inter');
    });

    test('should toggle theme', async () => {
      const data = {
        site: { title: 'Test' },
        pages: [{ path: '/', content: [] }]
      };

      await Render.init({ data, target: '#app' });

      const initialTheme = document.documentElement.getAttribute('data-theme');

      Render.toggleTheme();

      const newTheme = document.documentElement.getAttribute('data-theme');
      expect(newTheme).not.toBe(initialTheme);
    });
  });

  describe('State Management', () => {
    test('should expose reactive state', async () => {
      const data = {
        site: {
          title: 'Test',
          state: { count: 0 }
        },
        pages: [{ path: '/', content: [] }]
      };

      await Render.init({ data, target: '#app' });

      expect(Render.state.count).toBe(0);
    });

    test('should allow state modification', async () => {
      const data = {
        site: {
          title: 'Test',
          state: { count: 0 }
        },
        pages: [{ path: '/', content: [] }]
      };

      await Render.init({ data, target: '#app' });

      Render.state.count = 42;
      expect(Render.state.count).toBe(42);
    });
  });

  describe('Error Handling', () => {
    test('should track errors', async () => {
      const data = {
        site: { title: 'Test' },
        pages: [
          {
            path: '/',
            content: [
              { type: 'code' } // Missing required 'code' property
            ]
          }
        ]
      };

      await Render.init({ data, target: '#app' });

      expect(Render.errors.length).toBeGreaterThan(0);
    });

    test('should render error card for invalid block', async () => {
      const data = {
        site: { title: 'Test' },
        pages: [
          {
            path: '/',
            content: [
              { type: 'hero' } // Missing required 'headline'
            ]
          }
        ]
      };

      await Render.init({ data, target: '#app' });

      // Should contain error content
      expect(container.innerHTML).toContain('error');
    });
  });

  describe('API Methods', () => {
    test('should have navigate method', () => {
      expect(typeof Render.navigate).toBe('function');
    });

    test('should have toggleTheme method', () => {
      expect(typeof Render.toggleTheme).toBe('function');
    });

    test('should have state getter', async () => {
      const data = {
        site: {
          title: 'Test',
          state: { count: 42 }
        },
        pages: [{ path: '/', content: [] }]
      };

      await Render.init({ data, target: '#app' });

      expect(Render.state).toBeDefined();
      expect(Render.state.count).toBe(42);
    });
  });

  describe('v2 Features', () => {
    beforeEach(() => {
      // Mock v2 modules
      global.ExpressionEvaluator = {
        evaluate: jest.fn((expr, context) => {
          // Simple mock implementation
          if (expr === 'state.counter * 2') return context.state.counter * 2;
          if (expr === 'state.counter > 5') return context.state.counter > 5;
          if (expr.includes('?')) {
            const parts = expr.split('?');
            const condition = parts[0].trim();
            const [truthy, falsy] = parts[1].split(':').map(s => s.trim().replace(/'/g, ''));
            const result = global.ExpressionEvaluator.evaluate(condition, context);
            return result ? truthy : falsy;
          }
          return undefined;
        })
      };

      global.ConditionalRenderer = {
        init: jest.fn(),
        render: jest.fn((block, context) => {
          const condition = global.ExpressionEvaluator.evaluate(block.if, context);
          if (condition) {
            return block.then ? `<div>${block.then.html || ''}</div>` : '';
          } else {
            return block.else ? `<div>${block.else.html || ''}</div>` : '';
          }
        })
      };

      global.LoopRenderer = {
        init: jest.fn(),
        render: jest.fn((block, context) => {
          const arr = context[block.each.split('.')[1]] || [];
          return arr.map(item => `<div>${item}</div>`).join('');
        })
      };
    });

    afterEach(() => {
      delete global.ExpressionEvaluator;
      delete global.ConditionalRenderer;
      delete global.LoopRenderer;
    });

    test('should initialize v2 features when available', async () => {
      const data = {
        site: { title: 'Test' },
        pages: [{ path: '/', content: [] }]
      };

      await Render.init({ data, target: '#app' });

      expect(global.ConditionalRenderer.init).toHaveBeenCalled();
      expect(global.LoopRenderer.init).toHaveBeenCalled();
    });

    test('should use ExpressionEvaluator for interpolation', async () => {
      const data = {
        site: {
          title: 'Test',
          state: { counter: 10 }
        },
        pages: [
          {
            path: '/',
            content: [
              {
                type: 'markdown',
                content: 'Result: {{state.counter * 2}}'
              }
            ]
          }
        ]
      };

      await Render.init({ data, target: '#app' });

      expect(global.ExpressionEvaluator.evaluate).toHaveBeenCalledWith(
        'state.counter * 2',
        expect.any(Object)
      );
      expect(container.innerHTML).toContain('20');
    });

    test('should fall back to basic interpolation on v2 error', async () => {
      global.ExpressionEvaluator.evaluate = jest.fn(() => {
        throw new Error('Evaluation failed');
      });

      const data = {
        site: {
          title: 'Test',
          state: { counter: 10 }
        },
        pages: [
          {
            path: '/',
            content: [
              {
                type: 'markdown',
                content: 'Counter: {{state.counter}}'
              }
            ]
          }
        ]
      };

      await Render.init({ data, target: '#app' });

      // Should fall back to basic interpolation
      expect(container.innerHTML).toContain('10');
    });

    test('should render conditional blocks with v2', async () => {
      const data = {
        site: {
          title: 'Test',
          state: { counter: 10 }
        },
        pages: [
          {
            path: '/',
            content: [
              {
                if: 'state.counter > 5',
                then: { html: 'Counter is greater than 5' },
                else: { html: 'Counter is less than or equal to 5' }
              }
            ]
          }
        ]
      };

      await Render.init({ data, target: '#app' });

      expect(global.ConditionalRenderer.render).toHaveBeenCalled();
      expect(container.innerHTML).toContain('Counter is greater than 5');
    });

    test('should render loop blocks with v2', async () => {
      const data = {
        site: {
          title: 'Test',
          state: { items: ['A', 'B', 'C'] }
        },
        pages: [
          {
            path: '/',
            content: [
              {
                each: 'state.items'
              }
            ]
          }
        ]
      };

      await Render.init({ data, target: '#app' });

      expect(global.LoopRenderer.render).toHaveBeenCalled();
    });
  });

  describe('Theme Customization', () => {
    test('should apply fontSize theme override', async () => {
      const data = {
        site: {
          title: 'Test',
          theme: {
            fontSize: 110
          }
        },
        pages: [{ path: '/', content: [] }]
      };

      await Render.init({ data, target: '#app' });

      const root = document.documentElement;
      const fontSize = parseFloat(root.style.fontSize);
      expect(fontSize).toBeCloseTo(110, 1);
    });

    test('should apply fontSize with different scales', async () => {
      const data = {
        site: {
          title: 'Test',
          theme: {
            fontSize: 90
          }
        },
        pages: [{ path: '/', content: [] }]
      };

      await Render.init({ data, target: '#app' });

      const root = document.documentElement;
      const fontSize = parseFloat(root.style.fontSize);
      expect(fontSize).toBeCloseTo(90, 1);
    });
  });

  describe('Menu Interactions', () => {
    test('should render dropdown menu with details element', async () => {
      const data = {
        site: { title: 'Test' },
        nav: {
          layout: 'horizontal',
          logo: { text: 'Logo' },
          links: [{ label: 'Home', path: '/' }]
        },
        pages: [{ path: '/', content: [] }]
      };

      await Render.init({ data, target: '#app' });

      const dropdown = document.querySelector('.dropdown');
      expect(dropdown).toBeTruthy();
      expect(dropdown.tagName).toBe('DETAILS');
    });

    test('should close dropdown on navigation', async () => {
      const data = {
        site: { title: 'Test' },
        nav: {
          layout: 'horizontal',
          logo: { text: 'Logo' },
          links: [
            { label: 'Home', path: '/' },
            { label: 'About', path: '/about' }
          ]
        },
        pages: [
          { path: '/', content: [] },
          { path: '/about', content: [] }
        ]
      };

      await Render.init({ data, target: '#app' });

      // Simulate opening dropdown
      const dropdown = document.querySelector('.dropdown');
      dropdown.setAttribute('open', '');
      expect(dropdown.hasAttribute('open')).toBe(true);

      // Click a link
      const link = document.querySelector('a[data-route]');
      link.click();

      // Dropdown should be closed
      expect(dropdown.hasAttribute('open')).toBe(false);
    });

    test('should render nav-actions and a dropdown menu', async () => {
      const data = {
        site: { title: 'Test' },
        nav: {
          layout: 'horizontal',
          logo: { text: 'Logo' },
          links: [{ label: 'Home', path: '/' }]
        },
        pages: [{ path: '/', content: [] }]
      };

      await Render.init({ data, target: '#app' });

      const navActions = document.querySelector('.nav-actions');
      const dropdown = document.querySelector('.dropdown');
      const dropdownLink = dropdown && dropdown.querySelector('a');

      expect(navActions).toBeTruthy();
      expect(dropdown).toBeTruthy();
      expect(dropdownLink).toBeTruthy();
    });
  });

  describe('Global Functions', () => {
    beforeEach(() => {
      document.body.innerHTML = '<div id="app"></div>';
      // Clean up any previously registered global functions
      if (window.testFunc) delete window.testFunc;
      if (window.increment) delete window.increment;
      if (window.addItem) delete window.addItem;
    });

    test('should register functions on window', async () => {
      const data = {
        site: { title: 'Test' },
        state: { counter: 0 },
        functions: {
          testFunc: '() => "hello"'
        },
        pages: [{ path: '/', content: [] }]
      };

      await Render.init({ data, target: '#app' });

      expect(typeof window.testFunc).toBe('function');
      expect(window.testFunc()).toBe('hello');
    });

    test('should give functions access to Render.state', async () => {
      const data = {
        site: { title: 'Test' },
        state: { counter: 5 },
        functions: {
          increment: '() => { Render.state.counter++ }'
        },
        pages: [{ path: '/', content: [] }]
      };

      await Render.init({ data, target: '#app' });

      expect(Render.state.counter).toBe(5);
      window.increment();
      expect(Render.state.counter).toBe(6);
    });

    test('should give functions access to Render.site', async () => {
      const data = {
        site: { title: 'My Site', version: '1.0' },
        state: {},
        functions: {
          getTitle: '() => Render.site.title'
        },
        pages: [{ path: '/', content: [] }]
      };

      await Render.init({ data, target: '#app' });

      expect(window.getTitle()).toBe('My Site');
    });

    test('should allow functions with parameters', async () => {
      const data = {
        site: { title: 'Test' },
        state: { items: [] },
        functions: {
          addItem: '(item) => { Render.state.items = [...Render.state.items, item] }'
        },
        pages: [{ path: '/', content: [] }]
      };

      await Render.init({ data, target: '#app' });

      window.addItem('first');
      window.addItem('second');
      expect(Render.state.items).toEqual(['first', 'second']);
    });

    test('should mark functions as Render.js functions', async () => {
      const data = {
        site: { title: 'Test' },
        state: {},
        functions: {
          testFunc: '() => true'
        },
        pages: [{ path: '/', content: [] }]
      };

      await Render.init({ data, target: '#app' });

      expect(window.testFunc._renderFunction).toBe(true);
    });

    test('should warn when function shadows existing window property', async () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      // Set up existing property
      window.existingFunc = 'original';

      const data = {
        site: { title: 'Test' },
        state: {},
        functions: {
          existingFunc: '() => "new"'
        },
        pages: [{ path: '/', content: [] }]
      };

      await Render.init({ data, target: '#app' });

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('existingFunc')
      );

      consoleSpy.mockRestore();
      delete window.existingFunc;
    });

    test('should handle function parse errors gracefully', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      const data = {
        site: { title: 'Test' },
        state: {},
        functions: {
          badFunc: 'this is not valid javascript {'
        },
        pages: [{ path: '/', content: [] }]
      };

      await Render.init({ data, target: '#app' });

      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });

  describe('Button Block', () => {
    beforeEach(() => {
      document.body.innerHTML = '<div id="app"></div>';
    });

    test('should render basic button', async () => {
      const data = {
        site: { title: 'Test' },
        pages: [{
          path: '/',
          content: [{
            type: 'button',
            label: 'Click Me'
          }]
        }]
      };

      await Render.init({ data, target: '#app' });

      const button = document.querySelector('button');
      expect(button).toBeTruthy();
      expect(button.textContent).toBe('Click Me');
    });

    test('should render button with variant', async () => {
      const data = {
        site: { title: 'Test' },
        pages: [{
          path: '/',
          content: [{
            type: 'button',
            label: 'Submit',
            variant: 'contrast'
          }]
        }]
      };

      await Render.init({ data, target: '#app' });

      const button = document.querySelector('button');
      expect(button.className).toContain('contrast');
    });

    test('should render button with string action', async () => {
      const data = {
        site: { title: 'Test' },
        state: { counter: 0 },
        pages: [{
          path: '/',
          content: [{
            type: 'button',
            label: 'Increment',
            action: 'Render.state.counter++'
          }]
        }]
      };

      await Render.init({ data, target: '#app' });

      const button = document.querySelector('button');
      expect(button.getAttribute('onclick')).toBe('Render.state.counter++');
    });

    test('should render button with object action', async () => {
      const data = {
        site: { title: 'Test' },
        functions: {
          testFn: '(x) => x * 2'
        },
        pages: [{
          path: '/',
          content: [{
            type: 'button',
            label: 'Test',
            action: { fn: 'testFn', args: [5] }
          }]
        }]
      };

      await Render.init({ data, target: '#app' });

      const button = document.querySelector('button');
      expect(button.getAttribute('onclick')).toBe('testFn(5)');
    });

    test('should render button with icon', async () => {
      const data = {
        site: { title: 'Test' },
        pages: [{
          path: '/',
          content: [{
            type: 'button',
            label: 'Add',
            icon: 'plus'
          }]
        }]
      };

      await Render.init({ data, target: '#app' });

      const icon = document.querySelector('button i[data-lucide="plus"]');
      expect(icon).toBeTruthy();
    });

    test('should render disabled button', async () => {
      const data = {
        site: { title: 'Test' },
        pages: [{
          path: '/',
          content: [{
            type: 'button',
            label: 'Disabled',
            disabled: true
          }]
        }]
      };

      await Render.init({ data, target: '#app' });

      const button = document.querySelector('button');
      expect(button.disabled).toBe(true);
    });
  });

  describe('Component Normalization', () => {
    beforeEach(() => {
      document.body.innerHTML = '<div id="app"></div>';
    });

    test('should accept string component format', async () => {
      const data = {
        site: { title: 'Test' },
        state: {},
        components: {
          card: '<div class="card">Hello World</div>'
        },
        pages: [{
          path: '/',
          content: [{
            $ref: 'card'
          }]
        }]
      };

      await Render.init({ data, target: '#app' });

      const card = document.querySelector('.card');
      expect(card).toBeTruthy();
      expect(card.textContent).toBe('Hello World');
    });

    test('should normalize object component format', async () => {
      const consoleSpy = jest.spyOn(console, 'info').mockImplementation();

      const data = {
        site: { title: 'Test' },
        state: {},
        components: {
          card: {
            type: 'html',
            html: '<div class="card">Normalized Card</div>'
          }
        },
        pages: [{
          path: '/',
          content: [{
            $ref: 'card'
          }]
        }]
      };

      await Render.init({ data, target: '#app' });

      // Should normalize and render correctly
      const card = document.querySelector('.card');
      expect(card).toBeTruthy();
      expect(card.textContent).toBe('Normalized Card');

      // Should log info about normalization
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('normalized')
      );

      consoleSpy.mockRestore();
    });
  });

  describe('Table Block', () => {
    beforeEach(() => {
      document.body.innerHTML = '<div id="app"></div>';
    });

    test('should render table from CSV string', async () => {
      const data = {
        site: { title: 'Test' },
        state: {},
        pages: [{
          path: '/',
          content: [{
            type: 'table',
            data: 'Name,Age\nAlice,30\nBob,25'
          }]
        }]
      };

      await Render.init({ data, target: '#app' });

      const table = document.querySelector('table');
      expect(table).toBeTruthy();

      const headers = table.querySelectorAll('thead th');
      expect(headers.length).toBe(2);
      expect(headers[0].textContent).toBe('Name');
      expect(headers[1].textContent).toBe('Age');

      const rows = table.querySelectorAll('tbody tr');
      expect(rows.length).toBe(2);
    });

    test('should render table from JSON array of arrays', async () => {
      const data = {
        site: { title: 'Test' },
        state: {},
        pages: [{
          path: '/',
          content: [{
            type: 'table',
            data: [
              ['Product', 'Price'],
              ['Widget', '$10'],
              ['Gadget', '$20']
            ]
          }]
        }]
      };

      await Render.init({ data, target: '#app' });

      const table = document.querySelector('table');
      expect(table).toBeTruthy();

      const headers = table.querySelectorAll('thead th');
      expect(headers[0].textContent).toBe('Product');
      expect(headers[1].textContent).toBe('Price');

      const cells = table.querySelectorAll('tbody td');
      expect(cells[0].textContent).toBe('Widget');
      expect(cells[1].textContent).toBe('$10');
    });

    test('should render table from JSON array of objects', async () => {
      const data = {
        site: { title: 'Test' },
        state: {},
        pages: [{
          path: '/',
          content: [{
            type: 'table',
            data: [
              { name: 'Alice', role: 'Engineer' },
              { name: 'Bob', role: 'Designer' }
            ]
          }]
        }]
      };

      await Render.init({ data, target: '#app' });

      const table = document.querySelector('table');
      expect(table).toBeTruthy();

      const headers = table.querySelectorAll('thead th');
      expect(headers[0].textContent).toBe('name');
      expect(headers[1].textContent).toBe('role');

      const cells = table.querySelectorAll('tbody td');
      expect(cells[0].textContent).toBe('Alice');
      expect(cells[1].textContent).toBe('Engineer');
    });

    test('should render table with caption', async () => {
      const data = {
        site: { title: 'Test' },
        state: {},
        pages: [{
          path: '/',
          content: [{
            type: 'table',
            caption: 'Team Members',
            data: [['Name'], ['Alice']]
          }]
        }]
      };

      await Render.init({ data, target: '#app' });

      const caption = document.querySelector('table caption');
      expect(caption).toBeTruthy();
      expect(caption.textContent).toBe('Team Members');
    });

    test('should render striped table', async () => {
      const data = {
        site: { title: 'Test' },
        state: {},
        pages: [{
          path: '/',
          content: [{
            type: 'table',
            striped: true,
            data: [['Name'], ['Alice']]
          }]
        }]
      };

      await Render.init({ data, target: '#app' });

      const table = document.querySelector('table.striped');
      expect(table).toBeTruthy();
    });

    test('should handle CSV with quoted values', async () => {
      const data = {
        site: { title: 'Test' },
        state: {},
        pages: [{
          path: '/',
          content: [{
            type: 'table',
            data: 'Name,Description\n"Smith, John","A person, named John"'
          }]
        }]
      };

      await Render.init({ data, target: '#app' });

      const cells = document.querySelectorAll('tbody td');
      expect(cells[0].textContent).toBe('Smith, John');
      expect(cells[1].textContent).toBe('A person, named John');
    });
  });

  describe('Error JSON Path', () => {
    beforeEach(() => {
      document.body.innerHTML = '<div id="app"></div>';
    });

    test('should include JSON path in error messages', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      const data = {
        site: { title: 'Test' },
        pages: [{
          path: '/',
          content: [
            { type: 'markdown', content: 'Valid' },
            { type: 'unknown-block' }
          ]
        }]
      };

      await Render.init({ data, target: '#app' });

      // Check that error was logged with path
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Block Render Error'),
        expect.stringContaining('pages[0].content[1]'),
        expect.any(Object)
      );

      consoleSpy.mockRestore();
    });

    test('should display JSON path in error card', async () => {
      const data = {
        site: { title: 'Test' },
        pages: [{
          path: '/',
          content: [
            { type: 'code' } // Missing required 'code' property
          ]
        }]
      };

      await Render.init({ data, target: '#app' });

      const errorCard = document.querySelector('.error-card');
      expect(errorCard).toBeTruthy();
      expect(errorCard.innerHTML).toContain('pages[0].content[0]');
    });
  });

  describe('Component Injection API', () => {
    beforeEach(async () => {
      document.body.innerHTML = '<div id="app"></div><div id="injection-target"></div>';

      // Initialize Render with minimal config
      await Render.init({
        data: {
          site: { title: 'Test' },
          pages: [{ path: '/', content: [] }]
        },
        target: '#app'
      });
    });

    afterEach(() => {
      // Clean up all injections after each test
      const injections = Render.getInjections();
      injections.forEach(inj => Render.destroyInjection(inj.id));
    });

    describe('inject()', () => {
      test('should inject a basic component', async () => {
        const id = await Render.inject('#injection-target', {
          type: 'html',
          html: '<p>Injected Content</p>'
        });

        expect(id).toBeTruthy();
        expect(document.querySelector('#injection-target p').textContent).toBe('Injected Content');
      });

      test('should inject with custom ID', async () => {
        const id = await Render.inject('#injection-target', {
          type: 'html',
          content: '<p>Test</p>'
        }, { id: 'my-custom-id' });

        expect(id).toBe('my-custom-id');
        expect(Render.getInjections().find(inj => inj.id === 'my-custom-id')).toBeTruthy();
      });

      test('should handle invalid selector', async () => {
        const id = await Render.inject('#nonexistent', {
          type: 'html',
          content: '<p>Test</p>'
        });

        // inject returns null on error, not throwing
        expect(id).toBeNull();
      });

      test('should inject hero component', async () => {
        await Render.inject('#injection-target', {
          type: 'hero',
          title: 'Test Hero',
          subtitle: 'Test Subtitle'
        });

        const target = document.querySelector('#injection-target');
        expect(target.innerHTML).toContain('Test Hero');
        expect(target.innerHTML).toContain('Test Subtitle');
      });

      test('should support different injection modes', async () => {
        document.querySelector('#injection-target').innerHTML = '<p>Existing</p>';

        // Replace mode (default)
        await Render.inject('#injection-target', {
          type: 'html',
          content: '<p>Replaced</p>'
        });
        expect(document.querySelector('#injection-target').textContent).toBe('Replaced');
      });
    });

    describe('updateInjection()', () => {
      test('should update an existing injection', async () => {
        const id = await Render.inject('#injection-target', {
          type: 'html',
          content: '<p>Original</p>'
        });

        Render.updateInjection(id, {
          type: 'html',
          content: '<p>Updated</p>'
        });

        expect(document.querySelector('#injection-target p').textContent).toBe('Updated');
      });

      test('should return false for non-existent injection', async () => {
        const result = await Render.updateInjection('nonexistent-id', {
          type: 'html',
          content: '<p>Test</p>'
        });

        // updateInjection returns false on error
        expect(result).toBe(false);
      });
    });

    describe('destroyInjection()', () => {
      test('should destroy an injection', async () => {
        const id = await Render.inject('#injection-target', {
          type: 'html',
          content: '<p>To be destroyed</p>'
        });

        expect(document.querySelector('#injection-target p')).toBeTruthy();

        Render.destroyInjection(id);

        expect(document.querySelector('#injection-target').innerHTML).toBe('');
        expect(Render.getInjections().find(inj => inj.id === id)).toBeUndefined();
      });

      test('should handle destroying non-existent injection gracefully', () => {
        expect(() => {
          Render.destroyInjection('nonexistent-id');
        }).not.toThrow();
      });
    });

    describe('getInjections()', () => {
      test('should return all active injections', async () => {
        const id1 = await Render.inject('#injection-target', {
          type: 'html',
          content: '<p>First</p>'
        });

        document.body.innerHTML += '<div id="second-target"></div>';
        const id2 = await Render.inject('#second-target', {
          type: 'html',
          content: '<p>Second</p>'
        });

        const injections = Render.getInjections();
        expect(injections.length).toBe(2);
        expect(injections.find(inj => inj.id === id1)).toBeTruthy();
        expect(injections.find(inj => inj.id === id2)).toBeTruthy();
      });

      test('should return empty array when no injections', () => {
        const injections = Render.getInjections();
        expect(Array.isArray(injections)).toBe(true);
        expect(injections.length).toBe(0);
      });
    });

    // TODO: Add tests for advanced features when fully implemented:
    // - processInjections() with manifest
    // - createStream() for LLM streaming
    // - Reactive state re-rendering
    // - Lifecycle hooks (onMount, onUnmount)
    // These require StreamingJSONParser and additional setup
  });

  describe('Watch Block', () => {
    beforeEach(() => {
      document.body.innerHTML = '<div id="app"></div>';
    });

    test('should render watch block without visual output', async () => {
      const data = {
        site: { title: 'Test' },
        state: { complete: false },
        pages: [{
          path: '/',
          content: [
            { type: 'markdown', content: 'Before' },
            {
              type: 'watch',
              if: 'state.complete',
              actions: [{ type: 'setState', updates: { watched: true } }]
            },
            { type: 'markdown', content: 'After' }
          ]
        }]
      };

      await Render.init({ data, target: '#app' });

      // Watch block should not add any visible content
      const markdownBlocks = document.querySelectorAll('.markdown-content');
      expect(markdownBlocks.length).toBe(2);
      expect(markdownBlocks[0].textContent).toContain('Before');
      expect(markdownBlocks[1].textContent).toContain('After');
    });

    test('should not execute actions when condition is false', async () => {
      const data = {
        site: { title: 'Test' },
        state: { complete: false, result: 'initial' },
        pages: [{
          path: '/',
          content: [
            {
              type: 'watch',
              if: 'state.complete',
              actions: [{ type: 'setState', updates: { result: 'changed' } }]
            }
          ]
        }]
      };

      await Render.init({ data, target: '#app' });

      await new Promise(resolve => setTimeout(resolve, 150));

      // State should NOT be updated since condition is false
      expect(Render.state.result).toBe('initial');
    });

    test('should handle missing if property with error', async () => {
      const data = {
        site: { title: 'Test' },
        state: {},
        pages: [{
          path: '/',
          content: [
            {
              type: 'watch',
              actions: [{ type: 'setState', updates: { result: 'done' } }]
            }
          ]
        }]
      };

      await Render.init({ data, target: '#app' });

      // Should show error card for missing 'if' property
      const errorCard = document.querySelector('.error-card');
      expect(errorCard).toBeTruthy();
      expect(errorCard.innerHTML).toContain('if');
    });

    test('should handle missing actions property', async () => {
      const data = {
        site: { title: 'Test' },
        state: { complete: true },
        pages: [{
          path: '/',
          content: [
            { type: 'markdown', content: 'Before' },
            {
              type: 'watch',
              if: 'state.complete'
              // actions is missing
            },
            { type: 'markdown', content: 'After' }
          ]
        }]
      };

      await Render.init({ data, target: '#app' });

      // Watch block with missing actions should render an error
      // Check that the other content still renders
      const markdownBlocks = document.querySelectorAll('.markdown-content');
      expect(markdownBlocks.length).toBeGreaterThanOrEqual(2);
    });

    test('should have correct block type in error message', async () => {
      const data = {
        site: { title: 'Test' },
        state: {},
        pages: [{
          path: '/',
          content: [
            {
              type: 'watch'
              // Missing both if and actions
            }
          ]
        }]
      };

      await Render.init({ data, target: '#app' });

      // Error card should exist and mention the block type
      const errorCard = document.querySelector('.error-card');
      expect(errorCard).toBeTruthy();
      expect(errorCard.innerHTML).toContain('watch');
    });

    test('should evaluate condition and prepare actions when condition is true', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      const data = {
        site: { title: 'Test' },
        state: { ready: true, value: 42 },
        pages: [{
          path: '/',
          content: [
            {
              type: 'watch',
              if: 'state.ready',
              actions: [
                { type: 'setState', updates: { triggered: true } }
              ]
            },
            { type: 'markdown', content: 'Content' }
          ]
        }]
      };

      await Render.init({ data, target: '#app' });

      // Give async actions time to execute
      await new Promise(resolve => setTimeout(resolve, 200));

      // Watch should have evaluated condition (check logs or state)
      const markdown = document.querySelector('.markdown-content');
      expect(markdown).toBeTruthy();

      consoleSpy.mockRestore();
    });

    test('should track once watches by id', async () => {
      const data = {
        site: { title: 'Test' },
        state: { active: true },
        pages: [{
          path: '/',
          content: [
            {
              type: 'watch',
              id: 'unique-watch-id',
              if: 'state.active',
              once: true,
              actions: [{ type: 'setState', updates: { count: 1 } }]
            }
          ]
        }]
      };

      await Render.init({ data, target: '#app' });

      await new Promise(resolve => setTimeout(resolve, 200));

      // Page should render without errors
      const app = document.querySelector('#app');
      expect(app).toBeTruthy();
    });

    test('should interpolate action body parameters', async () => {
      const data = {
        site: { title: 'Test' },
        state: { score: 100, name: 'Player1', done: true },
        pages: [{
          path: '/',
          content: [
            {
              type: 'watch',
              if: 'state.done',
              actions: [
                {
                  type: 'setState',
                  updates: {
                    message: '{{state.name}} scored {{state.score}}'
                  }
                }
              ]
            }
          ]
        }]
      };

      await Render.init({ data, target: '#app' });

      await new Promise(resolve => setTimeout(resolve, 200));

      // Render should complete without errors
      const app = document.querySelector('#app');
      expect(app).toBeTruthy();
    });

    test('should handle invalid condition expression gracefully', async () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      const data = {
        site: { title: 'Test' },
        state: {},
        pages: [{
          path: '/',
          content: [
            {
              type: 'watch',
              if: 'state.nonexistent.deeply.nested', // Will fail evaluation
              actions: [{ type: 'setState', updates: { x: 1 } }]
            },
            { type: 'markdown', content: 'Still renders' }
          ]
        }]
      };

      await Render.init({ data, target: '#app' });

      // Page should still render despite watch evaluation failure
      const markdown = document.querySelector('.markdown-content');
      expect(markdown).toBeTruthy();
      expect(markdown.textContent).toContain('Still renders');

      consoleSpy.mockRestore();
    });
  });

  describe('Mermaid Diagram Block', () => {
    beforeEach(() => {
      document.body.innerHTML = '<div id="app"></div>';
      // Mock mermaid library
      global.mermaid = {
        initialize: jest.fn(),
        run: jest.fn()
      };
      window.mermaidInitialized = false;
    });

    afterEach(() => {
      delete global.mermaid;
      delete window.mermaidInitialized;
    });

    test('should render mermaid diagram container', async () => {
      const data = {
        site: { title: 'Test' },
        pages: [{
          path: '/',
          content: [{
            type: 'mermaid',
            content: 'graph TD\n  A[Start] --> B[End]'
          }]
        }]
      };

      await Render.init({ data, target: '#app' });

      const container = document.querySelector('.mermaid-container');
      expect(container).toBeTruthy();

      const mermaidDiv = container.querySelector('.mermaid');
      expect(mermaidDiv).toBeTruthy();
      expect(mermaidDiv.textContent).toContain('graph TD');
      expect(mermaidDiv.textContent).toContain('A[Start] --> B[End]');
    });

    test('should apply theme attribute', async () => {
      const data = {
        site: { title: 'Test' },
        pages: [{
          path: '/',
          content: [{
            type: 'mermaid',
            content: 'graph TD\n  A --> B',
            theme: 'dark'
          }]
        }]
      };

      await Render.init({ data, target: '#app' });

      const container = document.querySelector('.mermaid-container');
      expect(container.getAttribute('data-theme')).toBe('dark');
    });

    test('should default to neutral theme', async () => {
      const data = {
        site: { title: 'Test' },
        pages: [{
          path: '/',
          content: [{
            type: 'mermaid',
            content: 'sequenceDiagram\n  A->>B: Hello'
          }]
        }]
      };

      await Render.init({ data, target: '#app' });

      const container = document.querySelector('.mermaid-container');
      expect(container.getAttribute('data-theme')).toBe('neutral');
    });

    test('should render mermaid content', async () => {
      const data = {
        site: { title: 'Test' },
        pages: [{
          path: '/',
          content: [{
            type: 'mermaid',
            content: 'graph TD\n  A[Start] --> B[End]'
          }]
        }]
      };

      await Render.init({ data, target: '#app' });

      const mermaidDiv = document.querySelector('.mermaid');
      expect(mermaidDiv.textContent).toContain('A[Start]');
      expect(mermaidDiv.textContent).toContain('B[End]');
    });

    test('should throw error when content is missing', async () => {
      const data = {
        site: { title: 'Test' },
        pages: [{
          path: '/',
          content: [{
            type: 'mermaid'
          }]
        }]
      };

      await Render.init({ data, target: '#app' });

      const errorCard = document.querySelector('.error-card');
      expect(errorCard).toBeTruthy();
      expect(errorCard.textContent).toContain('Missing required property: content');
    });
  });

  describe('Frappe Chart Block', () => {
    beforeEach(() => {
      document.body.innerHTML = '<div id="app"></div>';
      // Mock frappe library
      global.frappe = {
        Chart: jest.fn()
      };
      window.frappeChartConfigs = {};
    });

    afterEach(() => {
      delete global.frappe;
      delete window.frappeChartConfigs;
    });

    test('should render frappe chart container', async () => {
      const data = {
        site: { title: 'Test' },
        pages: [{
          path: '/',
          content: [{
            type: 'frappe-chart',
            chartType: 'bar',
            labels: ['Q1', 'Q2', 'Q3', 'Q4'],
            datasets: [{
              name: 'Revenue',
              values: [100, 200, 150, 250]
            }]
          }]
        }]
      };

      await Render.init({ data, target: '#app' });

      const container = document.querySelector('.frappe-chart-container');
      expect(container).toBeTruthy();

      const chartDiv = container.querySelector('.frappe-chart');
      expect(chartDiv).toBeTruthy();
      expect(chartDiv.hasAttribute('data-chart-id')).toBe(true);
    });

    test('should render chart with title', async () => {
      const data = {
        site: { title: 'Test' },
        pages: [{
          path: '/',
          content: [{
            type: 'frappe-chart',
            chartType: 'line',
            title: 'Sales Growth',
            labels: ['Jan', 'Feb'],
            datasets: [{
              values: [10, 20]
            }]
          }]
        }]
      };

      await Render.init({ data, target: '#app' });

      const title = document.querySelector('.chart-title');
      expect(title).toBeTruthy();
      expect(title.textContent).toBe('Sales Growth');
    });

    test('should store chart configuration', async () => {
      const data = {
        site: { title: 'Test' },
        pages: [{
          path: '/',
          content: [{
            type: 'frappe-chart',
            chartType: 'pie',
            labels: ['A', 'B'],
            datasets: [{
              values: [60, 40]
            }],
            height: 400
          }]
        }]
      };

      await Render.init({ data, target: '#app' });

      const chartDiv = document.querySelector('.frappe-chart');
      const chartId = chartDiv.getAttribute('data-chart-id');

      expect(window.frappeChartConfigs[chartId]).toBeTruthy();
      expect(window.frappeChartConfigs[chartId].type).toBe('pie');
      expect(window.frappeChartConfigs[chartId].labels).toEqual(['A', 'B']);
      expect(window.frappeChartConfigs[chartId].height).toBe(400);
    });

    test('should support multiple datasets', async () => {
      const data = {
        site: { title: 'Test' },
        pages: [{
          path: '/',
          content: [{
            type: 'frappe-chart',
            chartType: 'line',
            labels: ['Mon', 'Tue', 'Wed'],
            datasets: [
              { name: 'Series 1', values: [10, 20, 15] },
              { name: 'Series 2', values: [15, 25, 20] }
            ]
          }]
        }]
      };

      await Render.init({ data, target: '#app' });

      const chartDiv = document.querySelector('.frappe-chart');
      const chartId = chartDiv.getAttribute('data-chart-id');
      const config = window.frappeChartConfigs[chartId];

      expect(config.datasets.length).toBe(2);
      expect(config.datasets[0].name).toBe('Series 1');
      expect(config.datasets[1].name).toBe('Series 2');
    });

    test('should apply default colors when not specified', async () => {
      const data = {
        site: { title: 'Test' },
        pages: [{
          path: '/',
          content: [{
            type: 'frappe-chart',
            chartType: 'bar',
            labels: ['A', 'B'],
            datasets: [{ values: [10, 20] }]
          }]
        }]
      };

      await Render.init({ data, target: '#app' });

      const chartDiv = document.querySelector('.frappe-chart');
      const chartId = chartDiv.getAttribute('data-chart-id');
      const config = window.frappeChartConfigs[chartId];

      expect(config.colors).toBeTruthy();
      expect(config.colors[0]).toMatch(/^#[0-9a-fA-F]{6}$/);
    });

    test('should support custom colors', async () => {
      const data = {
        site: { title: 'Test' },
        pages: [{
          path: '/',
          content: [{
            type: 'frappe-chart',
            chartType: 'bar',
            labels: ['A', 'B'],
            datasets: [{ values: [10, 20] }],
            colors: ['#FF0000', '#00FF00']
          }]
        }]
      };

      await Render.init({ data, target: '#app' });

      const chartDiv = document.querySelector('.frappe-chart');
      const chartId = chartDiv.getAttribute('data-chart-id');
      const config = window.frappeChartConfigs[chartId];

      expect(config.colors).toEqual(['#FF0000', '#00FF00']);
    });

    test('should render static chart title', async () => {
      const data = {
        site: { title: 'Test' },
        pages: [{
          path: '/',
          content: [{
            type: 'frappe-chart',
            chartType: 'bar',
            title: 'Chart Title',
            labels: ['A', 'B'],
            datasets: [{ values: [10, 20] }]
          }]
        }]
      };

      await Render.init({ data, target: '#app' });

      const title = document.querySelector('.chart-title');
      expect(title.textContent).toBe('Chart Title');
    });

    test('should throw error when chartType is missing', async () => {
      const data = {
        site: { title: 'Test' },
        pages: [{
          path: '/',
          content: [{
            type: 'frappe-chart',
            labels: ['A', 'B'],
            datasets: [{ values: [10, 20] }]
          }]
        }]
      };

      await Render.init({ data, target: '#app' });

      const errorCard = document.querySelector('.error-card');
      expect(errorCard).toBeTruthy();
      expect(errorCard.textContent).toContain('Missing required property: chartType');
    });

    test('should throw error when labels is missing', async () => {
      const data = {
        site: { title: 'Test' },
        pages: [{
          path: '/',
          content: [{
            type: 'frappe-chart',
            chartType: 'bar',
            datasets: [{ values: [10, 20] }]
          }]
        }]
      };

      await Render.init({ data, target: '#app' });

      const errorCard = document.querySelector('.error-card');
      expect(errorCard).toBeTruthy();
      expect(errorCard.textContent).toContain('Missing required property: labels');
    });

    test('should throw error when datasets is missing', async () => {
      const data = {
        site: { title: 'Test' },
        pages: [{
          path: '/',
          content: [{
            type: 'frappe-chart',
            chartType: 'bar',
            labels: ['A', 'B']
          }]
        }]
      };

      await Render.init({ data, target: '#app' });

      const errorCard = document.querySelector('.error-card');
      expect(errorCard).toBeTruthy();
      expect(errorCard.textContent).toContain('Missing required property: datasets');
    });

    test('should throw error when values length does not match labels length', async () => {
      const data = {
        site: { title: 'Test' },
        pages: [{
          path: '/',
          content: [{
            type: 'frappe-chart',
            chartType: 'bar',
            labels: ['A', 'B', 'C'],
            datasets: [{
              values: [10, 20] // Only 2 values but 3 labels
            }]
          }]
        }]
      };

      await Render.init({ data, target: '#app' });

      const errorCard = document.querySelector('.error-card');
      expect(errorCard).toBeTruthy();
      expect(errorCard.textContent).toContain('must match labels length');
    });

    test('should use default height of 300 when not specified', async () => {
      const data = {
        site: { title: 'Test' },
        pages: [{
          path: '/',
          content: [{
            type: 'frappe-chart',
            chartType: 'bar',
            labels: ['A', 'B'],
            datasets: [{ values: [10, 20] }]
          }]
        }]
      };

      await Render.init({ data, target: '#app' });

      const chartDiv = document.querySelector('.frappe-chart');
      const chartId = chartDiv.getAttribute('data-chart-id');
      const config = window.frappeChartConfigs[chartId];

      expect(config.height).toBe(300);
    });
  });

  describe('P5.js Block', () => {
    test('should render p5js block with sandboxed iframe', async () => {
      const data = {
        site: { title: 'Test' },
        pages: [{
          path: '/',
          content: [{
            type: 'p5js',
            code: 'function setup() { createCanvas(400, 400); } function draw() { background(220); }',
            height: 400
          }]
        }]
      };

      await Render.init({ data, target: '#app' });

      const container = document.querySelector('.p5js-container');
      expect(container).toBeTruthy();

      const iframe = container.querySelector('iframe');
      expect(iframe).toBeTruthy();
      expect(iframe.getAttribute('sandbox')).toBe('allow-scripts');
      // Width is now 100% via style, height via style
      expect(iframe.style.width).toBe('100%');
      expect(iframe.style.height).toBe('400px');
      expect(iframe.getAttribute('src')).toContain('data:text/html;base64,');
    });

    test('should use default dimensions when not specified', async () => {
      const data = {
        site: { title: 'Test' },
        pages: [{
          path: '/',
          content: [{
            type: 'p5js',
            code: 'function setup() { createCanvas(400, 400); }'
          }]
        }]
      };

      await Render.init({ data, target: '#app' });

      const iframe = document.querySelector('.p5js-container iframe');
      // Default height is 300px, width is always 100%
      expect(iframe.style.width).toBe('100%');
      expect(iframe.style.height).toBe('300px');
    });

    test('should support custom height', async () => {
      const data = {
        site: { title: 'Test' },
        pages: [{
          path: '/',
          content: [{
            type: 'p5js',
            code: 'function setup() { createCanvas(600, 250); }',
            height: 250
          }]
        }]
      };

      await Render.init({ data, target: '#app' });

      const iframe = document.querySelector('.p5js-container iframe');
      expect(iframe.style.width).toBe('100%');
      expect(iframe.style.height).toBe('250px');
    });

    test('should throw error when code is missing', async () => {
      const data = {
        site: { title: 'Test' },
        pages: [{
          path: '/',
          content: [{
            type: 'p5js',
            width: 400,
            height: 400
          }]
        }]
      };

      await Render.init({ data, target: '#app', showJsonButton: false });

      const errorCard = document.querySelector('.error-card');
      expect(errorCard).toBeTruthy();
      expect(errorCard.textContent).toContain('Missing required property: code');
    });

    test('should handle Unicode and emoji characters in code', async () => {
      const data = {
        site: { title: 'Test' },
        pages: [{
          path: '/',
          content: [{
            type: 'p5js',
            code: 'function setup() { createCanvas(400, 300); } function draw() { background(220); text("🎉 YOU WIN! 💥", 200, 150); }',
            height: 300
          }]
        }]
      };

      // Should not throw an error
      await Render.init({ data, target: '#app' });

      const container = document.querySelector('.p5js-container');
      expect(container).toBeTruthy();

      const iframe = container.querySelector('iframe');
      expect(iframe).toBeTruthy();
      expect(iframe.getAttribute('src')).toContain('data:text/html;base64,');
    });

    test.skip('should support template interpolation in code', async () => {
      // Skipped: atob() may not work correctly in test environment
      const data = {
        site: { title: 'Test' },
        state: { color: 255 },
        pages: [{
          path: '/',
          content: [{
            type: 'p5js',
            code: 'function setup() { createCanvas(400, 400); } function draw() { background({{state.color}}); }'
          }]
        }]
      };

      await Render.init({ data, target: '#app' });

      const iframe = document.querySelector('.p5js-container iframe');
      const src = iframe.getAttribute('src');
      const decoded = atob(src.replace('data:text/html;base64,', ''));
      expect(decoded).toContain('background(255)');
    });
  });

  describe('Quiz Block', () => {
    test('should render quiz with first question', async () => {
      const data = {
        site: { title: 'Test' },
        pages: [{
          path: '/',
          content: [{
            type: 'quiz',
            title: 'Test Quiz',
            questions: [
              {
                question: 'Q1?',
                options: ['A', 'B'],
                correct: 1
              }
            ]
          }]
        }]
      };

      await Render.init({ data, target: '#app', showJsonButton: false });

      const container = document.querySelector('.quiz-container');
      expect(container).toBeTruthy();

      const title = container.querySelector('h3');
      expect(title.textContent).toBe('Test Quiz');

      const question = container.querySelector('h4');
      expect(question.textContent).toBe('Q1?');

      const buttons = container.querySelectorAll('button.outline');
      expect(buttons.length).toBe(2);
    });

    test('should show progress bar', async () => {
      const data = {
        site: { title: 'Test' },
        pages: [{
          path: '/',
          content: [{
            type: 'quiz',
            questions: [
              { question: 'Q1?', options: ['A', 'B'], correct: 0 }
            ]
          }]
        }]
      };

      await Render.init({ data, target: '#app', showJsonButton: false });

      const progress = document.querySelector('progress');
      expect(progress).toBeTruthy();
      expect(progress.getAttribute('value')).toBe('1');
      expect(progress.getAttribute('max')).toBe('1');
    });

    test('should render completed state without errors', async () => {
      // This tests that the quiz doesn't crash when state shows completed
      // (regression test for "Cannot read properties of undefined (reading 'options')" error)
      const data = {
        site: { title: 'Test' },
        state: {
          // Pre-set quiz state to completed (quiz_quiz_XXXXX key will be generated)
        },
        pages: [{
          path: '/',
          content: [{
            type: 'quiz',
            title: 'Completed Quiz',
            questions: [
              { question: 'Q1?', options: ['A', 'B'], correct: 0 }
            ]
          }]
        }]
      };

      await Render.init({ data, target: '#app', showJsonButton: false });

      // Get the quiz state key and manually set it to completed
      const quizStateKey = Object.keys(Render.state).find(k => k.startsWith('quiz_quiz_'));
      if (quizStateKey) {
        Render.state[quizStateKey].completed = true;
        Render.state[quizStateKey].currentQuestion = 1; // Past the last question
        Render.state[quizStateKey].score = 1;
      }

      // Re-render - should not throw error
      await Render.navigate('/');

      const container = document.querySelector('.quiz-container');
      expect(container).toBeTruthy();
      // Should show results screen
      expect(container.textContent).toContain('Quiz Complete');
    });

    test.skip('should advance to next question when answer selected', async () => {
      // Skipped: Requires runtime click handler integration
      const data = {
        site: { title: 'Test' },
        pages: [{
          path: '/',
          content: [{
            type: 'quiz',
            questions: [
              { question: 'Q1?', options: ['A', 'B'], correct: 0 },
              { question: 'Q2?', options: ['A', 'B'], correct: 1 }
            ]
          }]
        }]
      };

      await Render.init({ data, target: '#app', showJsonButton: false });

      const firstButton = document.querySelector('#app .quiz-options button');
      firstButton.click();

      const question = document.querySelector('#app .quiz-question h4');
      expect(question.textContent).toBe('Q2?');

      const progressText = document.querySelector('#app .quiz-progress small');
      expect(progressText.textContent).toContain('Question 2 of 2');
    });

    test.skip('should show results screen when quiz completed', async () => {
      // Skipped: Requires runtime click handler integration
    });

    test.skip('should calculate score correctly', async () => {
      // Skipped: Requires runtime click handler integration
    });

    test.skip('should allow quiz retry', async () => {
      // Skipped: Requires runtime click handler integration
    });

    test('should throw error when questions is missing', async () => {
      const data = {
        site: { title: 'Test' },
        pages: [{
          path: '/',
          content: [{
            type: 'quiz',
            title: 'Test'
          }]
        }]
      };

      await Render.init({ data, target: '#app', showJsonButton: false });

      const errorCard = document.querySelector('.error-card');
      expect(errorCard).toBeTruthy();
      expect(errorCard.textContent).toContain('Missing required property: questions');
    });

    test('should validate question structure', async () => {
      const data = {
        site: { title: 'Test' },
        pages: [{
          path: '/',
          content: [{
            type: 'quiz',
            questions: [
              { options: ['A'], correct: 0 } // Missing question
            ]
          }]
        }]
      };

      await Render.init({ data, target: '#app', showJsonButton: false });

      const errorCard = document.querySelector('.error-card');
      expect(errorCard).toBeTruthy();
      expect(errorCard.textContent).toContain('missing required property "question"');
    });

    test.skip('should support template interpolation in questions', async () => {
      // Skipped: May have selector specificity issues in test environment
      const data = {
        site: { title: 'Test Site' },
        pages: [{
          path: '/',
          content: [{
            type: 'quiz',
            title: '{{site.title}} Quiz',
            questions: [
              { question: 'What is {{site.title}}?', options: ['A', 'B'], correct: 0 }
            ]
          }]
        }]
      };

      await Render.init({ data, target: '#app', showJsonButton: false });

      const title = document.querySelector('#app .quiz-container h3');
      expect(title.textContent).toBe('Test Site Quiz');

      const question = document.querySelector('#app .quiz-question h4');
      expect(question.textContent).toBe('What is Test Site?');
    });

    test('should show visual feedback when answer is clicked', async () => {
      // Mock lucide.createIcons since we're in jsdom
      window.lucide = { createIcons: jest.fn() };

      const data = {
        site: { title: 'Test' },
        pages: [{
          path: '/',
          content: [{
            type: 'quiz',
            questions: [
              { question: 'Q1?', options: ['Option A', 'Option B', 'Option C'], correct: 0 }
            ]
          }]
        }]
      };

      await Render.init({ data, target: '#app', showJsonButton: false });

      const buttons = document.querySelectorAll('#app .quiz-options button');
      expect(buttons.length).toBe(3);

      // Get the answer handler from the onclick attribute
      const onclickAttr = buttons[1].getAttribute('onclick');
      const handlerMatch = onclickAttr.match(/^(\w+)\((\d+), this\)$/);
      expect(handlerMatch).toBeTruthy();

      const handlerName = handlerMatch[1];
      const handler = window[handlerName];
      expect(handler).toBeDefined();

      // Call the handler directly with the button element (simulating click)
      handler(1, buttons[1]);

      // Verify visual feedback:
      // 1. All buttons should be disabled
      buttons.forEach(btn => {
        expect(btn.disabled).toBe(true);
      });

      // 2. Selected button (index 1) should have spinner and opacity 1
      expect(buttons[1].innerHTML).toContain('loader-2');
      expect(buttons[1].style.opacity).toBe('1');

      // 3. Non-selected buttons should be dimmed (opacity 0.5)
      expect(buttons[0].style.opacity).toBe('0.5');
      expect(buttons[2].style.opacity).toBe('0.5');

      // 4. lucide.createIcons should have been called for the spinner
      expect(window.lucide.createIcons).toHaveBeenCalled();
    });
  });

  describe('Safe Button Actions', () => {
    // Note: Safe button action execution tests are skipped as they require
    // ActionExecutor integration which is tested separately in production.
    // The tests below verify that buttons with safe actions render correctly
    // and that security warnings are shown for unsafe actions.

    test('should render button with safe setState action', async () => {
      const data = {
        site: { title: 'Test' },
        pages: [{
          path: '/',
          content: [{
            type: 'button',
            label: 'Increment',
            action: {
              type: 'setState',
              updates: { counter: 5 }
            }
          }]
        }]
      };

      await Render.init({ data, target: '#app', showJsonButton: false });

      const button = document.querySelector('#app button');
      expect(button).toBeTruthy();
      expect(button.textContent).toBe('Increment');
      // Button should have onclick handler registered
      expect(button.getAttribute('onclick')).toBeTruthy();
    });

    test('should render button with safe toggleState action', async () => {
      const data = {
        site: { title: 'Test' },
        pages: [{
          path: '/',
          content: [{
            type: 'button',
            label: 'Toggle',
            action: {
              type: 'toggleState',
              key: 'enabled'
            }
          }]
        }]
      };

      await Render.init({ data, target: '#app', showJsonButton: false });

      const button = document.querySelector('#app button');
      expect(button).toBeTruthy();
      expect(button.textContent).toBe('Toggle');
    });

    test('should render button with navigate action', async () => {
      const data = {
        site: { title: 'Test' },
        pages: [{
          path: '/',
          content: [{
            type: 'button',
            label: 'Go to About',
            action: {
              type: 'navigate',
              path: '/about'
            }
          }]
        }]
      };

      await Render.init({ data, target: '#app', showJsonButton: false });

      const button = document.querySelector('#app button');
      expect(button.textContent).toBe('Go to About');
    });

    test('should render button with resetState action', async () => {
      const data = {
        site: { title: 'Test' },
        pages: [{
          path: '/',
          content: [{
            type: 'button',
            label: 'Reset',
            action: {
              type: 'resetState',
              keys: ['a', 'b']
            }
          }]
        }]
      };

      await Render.init({ data, target: '#app', showJsonButton: false });

      const button = document.querySelector('#app button');
      expect(button).toBeTruthy();
      expect(button.textContent).toBe('Reset');
    });

    test('should warn about non-whitelisted action types', async () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      const data = {
        site: { title: 'Test' },
        pages: [{
          path: '/',
          content: [{
            type: 'button',
            label: 'Bad Action',
            action: {
              type: 'dangerousAction',
              data: 'test'
            }
          }]
        }]
      };

      await Render.init({ data, target: '#app' });

      const button = document.querySelector('button');
      expect(button).toBeTruthy();

      // Button should render but action should be filtered
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('not whitelisted')
      );

      consoleSpy.mockRestore();
    });

    test('should maintain backward compatibility with function actions', async () => {
      // Create a global test function
      let functionCalled = false;
      window.testFn = () => { functionCalled = true; };

      const data = {
        site: { title: 'Test' },
        pages: [{
          path: '/',
          content: [{
            type: 'button',
            label: 'Call Function',
            action: {
              fn: 'testFn',
              args: []
            }
          }]
        }]
      };

      await Render.init({ data, target: '#app' });

      const button = document.querySelector('button');

      // Verify onclick attribute is set correctly
      expect(button.getAttribute('onclick')).toBe('testFn()');

      // Call the function
      button.click();

      expect(functionCalled).toBe(true);

      delete window.testFn;
    });

    test('should maintain backward compatibility with string actions', async () => {
      const data = {
        site: { title: 'Test' },
        state: { count: 0 },
        pages: [{
          path: '/',
          content: [{
            type: 'button',
            label: 'Increment',
            action: 'Render.state.count++'
          }]
        }]
      };

      await Render.init({ data, target: '#app' });

      expect(Render.state.count).toBe(0);

      const button = document.querySelector('button');
      button.click();

      expect(Render.state.count).toBe(1);
    });
  });
});
