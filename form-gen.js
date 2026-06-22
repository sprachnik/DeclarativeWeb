// Form Generator from JSON
const FormGen = (() => {
  // Generate form HTML from JSON object
  const generateForm = (data, path = '') => {
    if (data === null || data === undefined) {
      return '<input type="text" value="" />'
    }

    const type = typeof data

    if (type === 'string') {
      const isMultiline = data.length > 80 || data.includes('\n')
      if (isMultiline) {
        return `<textarea rows="5">${escapeHtml(data)}</textarea>`
      }
      return `<input type="text" value="${escapeHtml(data)}" />`
    }

    if (type === 'number') {
      return `<input type="number" value="${data}" />`
    }

    if (type === 'boolean') {
      return `<input type="checkbox" ${data ? 'checked' : ''} />`
    }

    if (Array.isArray(data)) {
      const items = data.map((item, index) => {
        const itemPath = `${path}[${index}]`
        return `
          <div class="array-item" data-path="${itemPath}">
            <div class="array-item-header">
              <span>Item ${index + 1}</span>
              <button type="button" class="remove-item outline secondary" data-action="remove" data-index="${index}">
                <i data-lucide="x"></i> Remove
              </button>
            </div>
            <div class="array-item-content">
              ${generateForm(item, itemPath)}
            </div>
          </div>
        `
      }).join('')

      return `
        <div class="form-array" data-path="${path}">
          ${items}
          <button type="button" class="add-item outline" data-action="add">
            <i data-lucide="plus"></i> Add Item
          </button>
        </div>
      `
    }

    if (type === 'object') {
      const fields = Object.entries(data).map(([key, value]) => {
        const fieldPath = path ? `${path}.${key}` : key
        const fieldHtml = generateForm(value, fieldPath)

        return `
          <div class="form-field" data-path="${fieldPath}">
            <label>
              <strong>${formatLabel(key)}</strong>
              ${fieldHtml}
            </label>
          </div>
        `
      }).join('')

      return `<div class="form-object">${fields}</div>`
    }

    return ''
  }

  // Get form data back as JSON object
  const getFormData = (container) => {
    const data = {}

    // Process each form field
    const fields = container.querySelectorAll('.form-field')
    fields.forEach(field => {
      const path = field.getAttribute('data-path')

      // Skip form-fields that contain nested form-objects or form-arrays
      // (only process "leaf" fields with actual inputs)
      const hasNestedStructure = field.querySelector('.form-object, .form-array')
      if (hasNestedStructure) return

      const input = field.querySelector('input, textarea, select')

      if (!input) return

      let value
      if (input.type === 'checkbox') {
        value = input.checked
      } else if (input.type === 'number') {
        value = parseFloat(input.value) || 0
      } else {
        value = input.value
      }

      setValueByPath(data, path, value)
    })

    return data
  }

  // Helper: Set value at path (e.g., "nav.logo.text" or "pages[0].path")
  const setValueByPath = (obj, path, value) => {
    // Handle both dot notation and array notation
    const keys = []
    let current = ''
    let inBracket = false

    for (let i = 0; i < path.length; i++) {
      const char = path[i]

      if (char === '[') {
        if (current) keys.push({ key: current, isArray: false })
        current = ''
        inBracket = true
      } else if (char === ']') {
        keys.push({ key: parseInt(current), isArray: true })
        current = ''
        inBracket = false
      } else if (char === '.' && !inBracket) {
        if (current) keys.push({ key: current, isArray: false })
        current = ''
      } else {
        current += char
      }
    }

    if (current) keys.push({ key: current, isArray: false })

    // Navigate/create the path
    let target = obj
    for (let i = 0; i < keys.length - 1; i++) {
      const { key, isArray } = keys[i]
      const nextIsArray = i + 1 < keys.length && keys[i + 1].isArray

      if (!target[key]) {
        target[key] = nextIsArray ? [] : {}
      }
      target = target[key]
    }

    // Set the final value
    const lastKey = keys[keys.length - 1].key
    target[lastKey] = value
  }

  // Helper: Escape HTML
  const escapeHtml = (str) => {
    const div = document.createElement('div')
    div.textContent = str
    return div.innerHTML
  }

  // Helper: Format label from key
  const formatLabel = (key) => {
    return key
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, str => str.toUpperCase())
      .trim()
  }

  return {
    generateForm,
    getFormData
  }
})()

// Export for Node.js/testing
if (typeof module !== 'undefined' && module.exports) {
  module.exports = FormGen
  globalThis.FormGen = FormGen
}
