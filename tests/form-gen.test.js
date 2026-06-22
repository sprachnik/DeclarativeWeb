/**
 * @jest-environment jsdom
 */

// Load form-gen.js
require('../form-gen.js');

describe('FormGen - Form Generation from JSON', () => {
  describe('generateForm', () => {
    test('should generate text input for string', () => {
      const data = { name: 'John' };
      const html = FormGen.generateForm(data);

      expect(html).toContain('input type="text"');
      expect(html).toContain('value="John"');
    });

    test('should generate textarea for long string', () => {
      const longText = 'a'.repeat(100);
      const data = { description: longText };
      const html = FormGen.generateForm(data);

      expect(html).toContain('<textarea');
      expect(html).toContain(longText);
    });

    test('should generate textarea for multiline string', () => {
      const data = { content: 'Line 1\nLine 2\nLine 3' };
      const html = FormGen.generateForm(data);

      expect(html).toContain('<textarea');
      expect(html).toContain('Line 1\nLine 2\nLine 3');
    });

    test('should generate number input for number', () => {
      const data = { age: 25 };
      const html = FormGen.generateForm(data);

      expect(html).toContain('input type="number"');
      expect(html).toContain('value="25"');
    });

    test('should generate checkbox for boolean', () => {
      const dataTrue = { active: true };
      const htmlTrue = FormGen.generateForm(dataTrue);

      expect(htmlTrue).toContain('input type="checkbox"');
      expect(htmlTrue).toContain('checked');

      const dataFalse = { active: false };
      const htmlFalse = FormGen.generateForm(dataFalse);

      expect(htmlFalse).toContain('input type="checkbox"');
      expect(htmlFalse).not.toContain('checked');
    });

    test('should generate nested fields for objects', () => {
      const data = {
        user: {
          name: 'John',
          age: 30
        }
      };
      const html = FormGen.generateForm(data);

      expect(html).toContain('form-object');
      expect(html).toContain('name');
      expect(html).toContain('age');
    });

    test('should generate array with add/remove buttons', () => {
      const data = {
        items: ['Item 1', 'Item 2']
      };
      const html = FormGen.generateForm(data);

      expect(html).toContain('form-array');
      expect(html).toContain('array-item');
      expect(html).toContain('Item 1');
      expect(html).toContain('Item 2');
      expect(html).toContain('Add Item');
      expect(html).toContain('Remove');
    });

    test('should format labels from keys', () => {
      const data = { firstName: 'John', emailAddress: 'test@example.com' };
      const html = FormGen.generateForm(data);

      expect(html).toContain('First Name');
      expect(html).toContain('Email Address');
    });

    test('should escape HTML in values', () => {
      const data = { script: '<script>alert("xss")</script>' };
      const html = FormGen.generateForm(data);

      expect(html).not.toContain('<script>alert');
      expect(html).toContain('&lt;script&gt;');
    });

    test('should handle null values', () => {
      const data = { value: null };
      const html = FormGen.generateForm(data);

      expect(html).toContain('input type="text"');
      expect(html).toContain('value=""');
    });

    test('should handle undefined values', () => {
      const data = { value: undefined };
      const html = FormGen.generateForm(data);

      expect(html).toContain('input type="text"');
      expect(html).toContain('value=""');
    });

    test('should generate form for complex nested structure', () => {
      const data = {
        site: {
          title: 'My Site',
          theme: {
            primaryColor: '#ff0000',
            secondaryColor: '#00ff00'
          }
        },
        nav: {
          links: [
            { label: 'Home', path: '/' },
            { label: 'About', path: '/about' }
          ]
        }
      };

      const html = FormGen.generateForm(data);

      expect(html).toContain('site');
      expect(html).toContain('theme');
      expect(html).toContain('primaryColor');
      expect(html).toContain('nav');
      expect(html).toContain('links');
      expect(html).toContain('Home');
      expect(html).toContain('About');
    });
  });

  describe('getFormData', () => {
    let container;

    beforeEach(() => {
      container = document.createElement('div');
      document.body.appendChild(container);
    });

    afterEach(() => {
      document.body.removeChild(container);
    });

    test('should extract text input values', () => {
      container.innerHTML = `
        <div class="form-field" data-path="name">
          <input type="text" value="John" />
        </div>
      `;

      const data = FormGen.getFormData(container);
      expect(data.name).toBe('John');
    });

    test('should extract number input values', () => {
      container.innerHTML = `
        <div class="form-field" data-path="age">
          <input type="number" value="25" />
        </div>
      `;

      const data = FormGen.getFormData(container);
      expect(data.age).toBe(25);
    });

    test('should extract checkbox values', () => {
      container.innerHTML = `
        <div class="form-field" data-path="active">
          <input type="checkbox" checked />
        </div>
        <div class="form-field" data-path="inactive">
          <input type="checkbox" />
        </div>
      `;

      const data = FormGen.getFormData(container);
      expect(data.active).toBe(true);
      expect(data.inactive).toBe(false);
    });

    test('should extract textarea values', () => {
      container.innerHTML = `
        <div class="form-field" data-path="description">
          <textarea>Long text here</textarea>
        </div>
      `;

      const data = FormGen.getFormData(container);
      expect(data.description).toBe('Long text here');
    });

    test('should handle nested object paths', () => {
      container.innerHTML = `
        <div class="form-field" data-path="user.name">
          <input type="text" value="John" />
        </div>
        <div class="form-field" data-path="user.age">
          <input type="number" value="30" />
        </div>
      `;

      const data = FormGen.getFormData(container);
      expect(data.user.name).toBe('John');
      expect(data.user.age).toBe(30);
    });

    test('should handle deeply nested paths', () => {
      container.innerHTML = `
        <div class="form-field" data-path="site.theme.primaryColor">
          <input type="text" value="#ff0000" />
        </div>
      `;

      const data = FormGen.getFormData(container);
      expect(data.site.theme.primaryColor).toBe('#ff0000');
    });

    test('should ignore fields without inputs', () => {
      container.innerHTML = `
        <div class="form-field" data-path="empty">
          <label>Empty Field</label>
        </div>
      `;

      const data = FormGen.getFormData(container);
      expect(data.empty).toBeUndefined();
    });

    test('should handle empty values', () => {
      container.innerHTML = `
        <div class="form-field" data-path="emptyString">
          <input type="text" value="" />
        </div>
        <div class="form-field" data-path="emptyNumber">
          <input type="number" value="" />
        </div>
      `;

      const data = FormGen.getFormData(container);
      expect(data.emptyString).toBe('');
      expect(data.emptyNumber).toBe(0);
    });
  });

  describe('Round-trip: generateForm -> getFormData', () => {
    let container;

    beforeEach(() => {
      container = document.createElement('div');
      document.body.appendChild(container);
    });

    afterEach(() => {
      document.body.removeChild(container);
    });

    test('should preserve simple data structure', () => {
      const originalData = {
        name: 'John',
        age: 30,
        active: true
      };

      container.innerHTML = FormGen.generateForm(originalData);
      const extractedData = FormGen.getFormData(container);

      expect(extractedData.name).toBe(originalData.name);
      expect(extractedData.age).toBe(originalData.age);
      expect(extractedData.active).toBe(originalData.active);
    });

    test('should preserve nested object structure', () => {
      const originalData = {
        user: {
          name: 'John',
          profile: {
            bio: 'Developer',
            age: 30
          }
        }
      };

      container.innerHTML = FormGen.generateForm(originalData);
      const extractedData = FormGen.getFormData(container);

      expect(extractedData.user.name).toBe(originalData.user.name);
      expect(extractedData.user.profile.bio).toBe(originalData.user.profile.bio);
      expect(extractedData.user.profile.age).toBe(originalData.user.profile.age);
    });
  });
});
