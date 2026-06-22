/**
 * Bundle Integration Test
 * Verifies that the bundled declarativeweb.min.js works correctly
 */

const fs = require('fs');
const path = require('path');
const vm = require('vm');

describe('Bundle Integration', () => {
  let bundleCode;

  beforeAll(() => {
    // Load the bundle
    const bundlePath = path.join(__dirname, '..', 'dist', 'declarativeweb.min.js');

    if (!fs.existsSync(bundlePath)) {
      throw new Error('Bundle not found. Run "npm run build" first.');
    }

    bundleCode = fs.readFileSync(bundlePath, 'utf8');
  });

  test('bundle file exists and has content', () => {
    expect(bundleCode).toBeDefined();
    expect(bundleCode.length).toBeGreaterThan(10000); // Should be at least 10KB
  });

  test('bundle contains all required modules', () => {
    // Check for key identifiers from each module
    const requiredPatterns = [
      'ExpressionEvaluator',
      'ConditionalRenderer',
      'LoopRenderer',
      'StateManager',
      'WatchManager',
      'DataFetcher',
      'ActionExecutor',
      'StreamingJSONParser',
      'FormGen',
      'Render'
    ];

    for (const pattern of requiredPatterns) {
      expect(bundleCode).toContain(pattern);
    }
  });

  test('bundle does not use Node.js-only globals', () => {
    // These patterns would break in browsers
    // Match "global." but not "globalThis."
    const nodeOnlyPatterns = [
      /[^l]global\./,  // "global." but not "globalThis."
      /\bprocess\./,   // process.env, process.exit, etc.
      /\brequire\(/,   // require() calls
      /\b__dirname\b/, // __dirname
      /\b__filename\b/ // __filename
    ];

    for (const pattern of nodeOnlyPatterns) {
      const match = bundleCode.match(pattern);
      if (match) {
        fail(`Bundle contains Node.js-only code: "${match[0]}" - this will break in browsers`);
      }
    }
  });

  describe('bundle execution in browser-like context', () => {
    let context;

    beforeEach(() => {
      // Set up DOM environment
      document.body.innerHTML = '<div id="app"></div>';

      // Create a browser-like context for vm
      context = {
        // Node.js/browser globals (for module.exports compatibility)
        globalThis: {},
        module: { exports: {} },
        // DOM globals
        window: global.window,
        document: global.document,
        console: {
          log: jest.fn(),
          warn: jest.fn(),
          error: jest.fn()
        },
        setTimeout: global.setTimeout,
        setInterval: global.setInterval,
        clearTimeout: global.clearTimeout,
        clearInterval: global.clearInterval,
        fetch: global.fetch,
        localStorage: {
          getItem: jest.fn(() => null),
          setItem: jest.fn(),
          removeItem: jest.fn()
        },
        sessionStorage: {
          getItem: jest.fn(() => null),
          setItem: jest.fn(),
          removeItem: jest.fn()
        },
        location: { pathname: '/', search: '', hash: '' },
        history: { pushState: jest.fn(), replaceState: jest.fn() },
        // For matchMedia
        matchMedia: jest.fn().mockImplementation(query => ({
          matches: false,
          media: query,
          onchange: null,
          addListener: jest.fn(),
          removeListener: jest.fn(),
          addEventListener: jest.fn(),
          removeEventListener: jest.fn(),
          dispatchEvent: jest.fn(),
        })),
      };

      // Add window reference to itself
      context.window.matchMedia = context.matchMedia;
      context.window.localStorage = context.localStorage;
      context.window.sessionStorage = context.sessionStorage;

      // Set globalThis to point to context for module.exports compatibility
      context.globalThis = context;

      // Create VM context
      vm.createContext(context);
    });

    test('bundle executes without errors', () => {
      expect(() => {
        vm.runInContext(bundleCode, context);
      }).not.toThrow();
    });

    test('bundle exposes Render global', () => {
      vm.runInContext(bundleCode, context);
      expect(context.Render).toBeDefined();
      expect(typeof context.Render.init).toBe('function');
    });

    test('bundle exposes ExpressionEvaluator global', () => {
      vm.runInContext(bundleCode, context);
      expect(context.ExpressionEvaluator).toBeDefined();
      expect(typeof context.ExpressionEvaluator.evaluate).toBe('function');
    });

    test('bundle exposes StreamingJSONParser global', () => {
      vm.runInContext(bundleCode, context);
      expect(context.StreamingJSONParser).toBeDefined();
      expect(typeof context.StreamingJSONParser.create).toBe('function');
    });

    test('ExpressionEvaluator works in bundle', () => {
      vm.runInContext(bundleCode, context);

      const evalContext = {
        state: { count: 42 },
        site: { title: 'Test' }
      };

      const result = context.ExpressionEvaluator.evaluate('state.count + 1', evalContext);
      expect(result).toBe(43);
    });

    test('StreamingJSONParser works in bundle', () => {
      vm.runInContext(bundleCode, context);

      const parser = context.StreamingJSONParser.create();
      parser.append('{"type": "hero", "headline": "Test"}');
      const result = parser.tryParse();

      expect(result).toEqual({
        type: 'hero',
        headline: 'Test'
      });
    });

    test('Render.init works with basic config', async () => {
      vm.runInContext(bundleCode, context);

      const testData = {
        site: { title: 'Test Site' },
        pages: [{
          path: '/',
          content: [{ type: 'html', content: '<p>Hello Bundle</p>' }]
        }]
      };

      await context.Render.init({
        data: testData,
        target: '#app'
      });

      expect(document.getElementById('app').innerHTML).toContain('Hello Bundle');
    });
  });
});
