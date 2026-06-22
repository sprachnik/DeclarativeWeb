/**
 * @jest-environment node
 */

const StreamingJSONParser = require('../streaming-json-parser')

describe('StreamingJSONParser', () => {
  let parser

  beforeEach(() => {
    parser = StreamingJSONParser.create()
  })

  describe('basic parsing', () => {
    test('parses complete JSON in one chunk', () => {
      parser.append('[{"type": "hero", "headline": "Hello"}]')
      const result = parser.complete()
      expect(result).toEqual([{ type: 'hero', headline: 'Hello' }])
    })

    test('parses JSON across multiple chunks', () => {
      parser.append('[{"type": ')
      parser.append('"hero", ')
      parser.append('"headline": "Hello"}]')
      const result = parser.complete()
      expect(result).toEqual([{ type: 'hero', headline: 'Hello' }])
    })

    test('handles empty input', () => {
      const result = parser.complete()
      expect(result).toBeNull()
    })
  })

  describe('markdown fence stripping', () => {
    test('strips ```json fence from start', () => {
      parser.append('```json\n[{"type": "hero"}]')
      const result = parser.complete()
      expect(result).toEqual([{ type: 'hero' }])
    })

    test('strips ``` fence from end', () => {
      parser.append('[{"type": "hero"}]\n```')
      const result = parser.complete()
      expect(result).toEqual([{ type: 'hero' }])
    })

    test('strips both opening and closing fences', () => {
      parser.append('```json\n[{"type": "hero", "headline": "Test"}]\n```')
      const result = parser.complete()
      expect(result).toEqual([{ type: 'hero', headline: 'Test' }])
    })

    test('strips fences arriving in separate chunks', () => {
      parser.append('```json\n')
      parser.append('[{"type": "section"}]')
      parser.append('\n```')
      const result = parser.complete()
      expect(result).toEqual([{ type: 'section' }])
    })

    test('strips ``` fence without json language specifier', () => {
      parser.append('```\n[{"type": "markdown"}]\n```')
      const result = parser.complete()
      expect(result).toEqual([{ type: 'markdown' }])
    })

    test('handles fence split across chunks', () => {
      parser.append('``')
      parser.append('`json\n[{"type": "hero"}]``')
      parser.append('`')
      const result = parser.complete()
      expect(result).toEqual([{ type: 'hero' }])
    })
  })

  describe('partial JSON completion', () => {
    test('completes unclosed array', () => {
      parser.append('[{"type": "hero"}')
      const result = parser.complete()
      expect(result).toEqual([{ type: 'hero' }])
    })

    test('completes unclosed object', () => {
      parser.append('[{"type": "hero", "headline": "Test"')
      const result = parser.complete()
      expect(result).toEqual([{ type: 'hero', headline: 'Test' }])
    })

    test('completes unclosed string', () => {
      parser.append('[{"type": "hero", "headline": "Test')
      const result = parser.complete()
      expect(result).toEqual([{ type: 'hero', headline: 'Test' }])
    })

    test('handles trailing comma', () => {
      parser.append('[{"type": "hero"},')
      const result = parser.complete()
      expect(result).toEqual([{ type: 'hero' }])
    })

    test('completes deeply nested structures', () => {
      parser.append('[{"type": "section", "resources": [{"title": "Card"')
      const result = parser.complete()
      expect(result).toEqual([{ type: 'section', resources: [{ title: 'Card' }] }])
    })
  })

  describe('progressive updates', () => {
    test('calls onUpdate with partial results', () => {
      const updates = []
      parser = StreamingJSONParser.create({
        onUpdate: (parsed) => updates.push(JSON.parse(JSON.stringify(parsed)))
      })

      parser.append('[{"type": "hero"}')
      parser.append(', {"type": "section"}]')

      expect(updates.length).toBeGreaterThan(0)
      expect(updates[updates.length - 1]).toEqual([
        { type: 'hero' },
        { type: 'section' }
      ])
    })

    test('provides isComplete metadata', () => {
      let lastMeta = null
      parser = StreamingJSONParser.create({
        onUpdate: (parsed, meta) => { lastMeta = meta }
      })

      parser.append('[{"type": "hero"}')
      expect(lastMeta.isComplete).toBe(false)

      parser.append(']')
      expect(lastMeta.isComplete).toBe(true)
    })
  })

  describe('getState', () => {
    test('returns current parser state', () => {
      parser.append('[{"type": "hero"}]')
      const state = parser.getState()

      expect(state.buffer).toBe('[{"type": "hero"}]')
      expect(state.isComplete).toBe(true)
      expect(state.parseAttempts).toBe(1)
    })
  })

  describe('reset', () => {
    test('clears parser state', () => {
      parser.append('[{"type": "hero"}]')
      parser.reset()

      const state = parser.getState()
      expect(state.buffer).toBe('')
      expect(state.lastValidJSON).toBeNull()
      expect(state.parseAttempts).toBe(0)
    })
  })

  describe('edge cases', () => {
    test('handles multiple objects in array', () => {
      parser.append('[{"type":"hero"},{"type":"section"},{"type":"markdown"}]')
      const result = parser.complete()
      expect(result).toHaveLength(3)
    })

    test('handles special characters in strings', () => {
      parser.append('[{"type": "hero", "headline": "Hello \\"World\\""}]')
      const result = parser.complete()
      expect(result[0].headline).toBe('Hello "World"')
    })

    test('handles newlines in JSON', () => {
      parser.append('[\n  {\n    "type": "hero"\n  }\n]')
      const result = parser.complete()
      expect(result).toEqual([{ type: 'hero' }])
    })

    test('handles unicode characters', () => {
      parser.append('[{"type": "hero", "headline": "Hello 世界 🌍"}]')
      const result = parser.complete()
      expect(result[0].headline).toBe('Hello 世界 🌍')
    })

    test('ignores appends after complete', () => {
      parser.append('[{"type": "hero"}]')
      parser.complete()
      parser.append('[{"type": "section"}]')
      const result = parser.getLastValid()
      expect(result).toEqual([{ type: 'hero' }])
    })
  })
})
