/**
 * Tests for template preprocessor
 */

import { describe, it, expect } from 'vitest';
import { mejs, _test } from '../machinery/bobbin/mejs.js';

// Destructure test internals
const { preprocess: preprocessTemplate, postprocess: postprocessOutput, process: processTemplate, defaultOptions: defaultPreprocessorOptions } = _test;

// EJS will be dynamically imported for integration tests
let ejs: typeof import('ejs') | null = null;

beforeAll(async () => {
  ejs = await import('ejs');
});

describe('preprocessTemplate', () => {
  describe('output delimiters', () => {
    it('should convert {{ expr }} to <%- expr %> (unescaped)', () => {
      const input = 'Hello {{ name }}!';
      const result = preprocessTemplate(input);
      expect(result).toBe('Hello <%- name %>!');
    });

    it('should convert {{ expr }} to <%= expr %> when escapeByDefault is true', () => {
      const input = 'Hello {{ name }}!';
      const result = preprocessTemplate(input, { escapeByDefault: true });
      expect(result).toBe('Hello <%= name %>!');
    });

    it('should convert {h expr } to <%= expr %> (html escaped)', () => {
      const input = 'Text: {h content }';
      const result = preprocessTemplate(input);
      expect(result).toBe('Text: <%= content %>');
    });

    it('should convert {_ expr } to <%- expr _%> (trim trailing)', () => {
      const input = '{_ value }';
      const result = preprocessTemplate(input);
      expect(result).toBe('<%-_ value %>');
    });

    it('should convert {{_ expr _}} to <%-_ expr _%> (trim both)', () => {
      const input = '{{_ value _}}';
      const result = preprocessTemplate(input);
      expect(result).toBe('<%-_ value _%>');
    });

    it('should convert {h_ expr } to <%=_ expr %> (html + trim trailing)', () => {
      const input = '{h_ value }';
      const result = preprocessTemplate(input);
      expect(result).toBe('<%=_ value %>');
    });

    it('should convert {_ expr _h} to <%-_ expr _%> (trim both + html)', () => {
      const input = '{_ value _h}';
      const result = preprocessTemplate(input);
      expect(result).toBe('<%=_ value _%>');
    });
  });

  describe('code blocks', () => {
    it('should NOT process blocks that already have braces (raw JS)', () => {
      // This has { so it's treated as raw JavaScript and left untouched
      const input = '{% if (x) { %}';
      const result = preprocessTemplate(input);
      // Goes through standard code block processing: trim trailing
      expect(result).toBe('<% if (x) { _%>');
    });

    it('should convert {%+ code %} to <% code %> (preserve whitespace)', () => {
      const input = '{%+ if (x) { %}';
      const result = preprocessTemplate(input);
      expect(result).toBe('<% if (x) { %>');
    });

    it('should handle multiple code blocks', () => {
      const input = '{% a %}{% b %}';
      const result = preprocessTemplate(input);
      expect(result).toBe('<% a _%><% b _%>');
    });
  });

  describe('control flow simplification', () => {
    it('should convert {% if condition %} to <%_ if (condition) { _%>', () => {
      const input = '{% if isReady %}';
      const result = preprocessTemplate(input);
      expect(result).toBe('<%_ if (isReady) { _%>');
    });

    it('should convert {% else %} to <%_ } else { _%>', () => {
      const input = '{% else %}';
      const result = preprocessTemplate(input);
      expect(result).toBe('<%_ } else { _%>');
    });

    it('should convert {% elif condition %} to <%_ } else if (condition) { _%>', () => {
      const input = '{% elif isLoading %}';
      const result = preprocessTemplate(input);
      expect(result).toBe('<%_ } else if (isLoading) { _%>');
    });

    it('should convert {% else if condition %} to <%_ } else if (condition) { _%>', () => {
      const input = '{% else if isError %}';
      const result = preprocessTemplate(input);
      expect(result).toBe('<%_ } else if (isError) { _%>');
    });

    it('should convert {% endif %} to <%_ } _%>', () => {
      const input = '{% endif %}';
      const result = preprocessTemplate(input);
      expect(result).toBe('<%_ } _%>');
    });

    it('should convert {% for item in items %} to <%_ for (const item of items) { _%>', () => {
      const input = '{% for item in items %}';
      const result = preprocessTemplate(input);
      expect(result).toBe('<%_ for (const item of items) { _%>');
    });

    it('should convert {% endfor %} to <%_ } _%>', () => {
      const input = '{% endfor %}';
      const result = preprocessTemplate(input);
      expect(result).toBe('<%_ } _%>');
    });

    it('should convert {% while condition %} to <%_ while (condition) { _%>', () => {
      const input = '{% while running %}';
      const result = preprocessTemplate(input);
      expect(result).toBe('<%_ while (running) { _%>');
    });

    it('should convert {% endwhile %} to <%_ } _%>', () => {
      const input = '{% endwhile %}';
      const result = preprocessTemplate(input);
      expect(result).toBe('<%_ } _%>');
    });

    it('should convert classic for loop syntax', () => {
      const input = '{% for i=0; i<10; i++ %}';
      const result = preprocessTemplate(input);
      expect(result).toBe('<%_ for (i=0; i<10; i++) { _%>');
    });

    it('should handle complex if-elif-else chain', () => {
      const input = `
{% if x > 0 %}
positive
{% elif x < 0 %}
negative
{% else %}
zero
{% endif %}
      `.trim();
      const result = preprocessTemplate(input);
      expect(result).toContain('<%_ if (x > 0) { _%>');
      expect(result).toContain('<%_ } else if (x < 0) { _%>');
      expect(result).toContain('<%_ } else { _%>');
      expect(result).toContain('<%_ } _%>');
    });

    it('should not simplify when simplifyControlFlow is false', () => {
      const input = '{% if condition %}';
      const result = preprocessTemplate(input, { simplifyControlFlow: false });
      // Should go through normal code block processing
      expect(result).toBe('<% if condition _%>');
    });
  });

  describe('combined patterns', () => {
    it('should handle if-else with output', () => {
      const input = `
{% if isActive %}
  Active: {{ name }}
{% else %}
  Inactive
{% endif %}
      `.trim();
      const result = preprocessTemplate(input);
      expect(result).toContain('<%_ if (isActive) { _%>');
      expect(result).toContain('<%- name %>');
      expect(result).toContain('<%_ } else { _%>');
      expect(result).toContain('<%_ } _%>');
    });

    it('should handle for loop with output', () => {
      const input = `
{% for item in items %}
  - {{ item.name }}: {{ item.value }}
{% endfor %}
      `.trim();
      const result = preprocessTemplate(input);
      expect(result).toContain('<%_ for (const item of items) { _%>');
      expect(result).toContain('<%- item.name %>');
      expect(result).toContain('<%- item.value %>');
      expect(result).toContain('<%_ } _%>');
    });

    it('should handle nested control flow', () => {
      const input = `
{% for user in users %}
  {% if user.active %}
    {{ user.name }} is active
  {% endif %}
{% endfor %}
      `.trim();
      const result = preprocessTemplate(input);
      expect(result).toContain('<%_ for (const user of users) { _%>');
      expect(result).toContain('<%_ if (user.active) { _%>');
      expect(result).toContain('<%_ } _%>'); // Two of these
    });
  });

  describe('edge cases', () => {
    it('should handle empty template', () => {
      const result = preprocessTemplate('');
      expect(result).toBe('');
    });

    it('should handle template without delimiters', () => {
      const input = 'Just plain text';
      const result = preprocessTemplate(input);
      expect(result).toBe('Just plain text');
    });

    it('should handle complex expressions in output', () => {
      const input = '{{ user.name.toUpperCase() }}';
      const result = preprocessTemplate(input);
      expect(result).toBe('<%- user.name.toUpperCase() %>');
    });

    it('should handle multiline code blocks with raw JS', () => {
      // Contains { so treated as raw JavaScript
      const input = '{%\n  const x = 1;\n  const y = 2;\n%}';
      const result = preprocessTemplate(input);
      // Standard processing trims whitespace at ends, including newlines
      expect(result).toBe('<% const x = 1;\n  const y = 2; _%>');
    });
  });
});

describe('postprocessOutput', () => {
  it('should trim trailing whitespace from lines', () => {
    const input = 'line 1   \nline 2\t\nline 3';
    const result = postprocessOutput(input);
    expect(result).toBe('line 1\nline 2\nline 3');
  });

  it('should handle empty string', () => {
    const result = postprocessOutput('');
    expect(result).toBe('');
  });

  it('should preserve intentional empty lines', () => {
    const input = 'line 1\n\nline 2';
    const result = postprocessOutput(input);
    expect(result).toBe('line 1\n\nline 2');
  });
});

describe('processTemplate (integration)', () => {
  it('should process and render a simple template', async () => {
    if (!ejs) throw new Error('EJS not loaded');
    
    const template = 'Hello {{ name }}!';
    const data = { name: 'World' };
    
    const result = await processTemplate(template, data, { ejs });
    expect(result).toBe('Hello World!');
  });

  it('should process and render with control flow', async () => {
    if (!ejs) throw new Error('EJS not loaded');
    
    const template = '{% if show %}{{ value }}{% endif %}';
    
    const result1 = await processTemplate(template, { show: true, value: 'yes' }, { ejs });
    expect(result1).toContain('yes');
    
    const result2 = await processTemplate(template, { show: false, value: 'yes' }, { ejs });
    expect(result2).not.toContain('yes');
  });

  it('should process and render with for loop', async () => {
    if (!ejs) throw new Error('EJS not loaded');
    
    const template = '{% for item in items %}{{ item }}{% endfor %}';
    const data = { items: ['a', 'b', 'c'] };
    
    const result = await processTemplate(template, data, { ejs });
    expect(result).toBe('abc');
  });

  it('should handle else branch', async () => {
    if (!ejs) throw new Error('EJS not loaded');
    
    const template = '{% if active %}ON{% else %}OFF{% endif %}';
    
    const result1 = await processTemplate(template, { active: true }, { ejs });
    expect(result1).toContain('ON');
    
    const result2 = await processTemplate(template, { active: false }, { ejs });
    expect(result2).toContain('OFF');
  });

  it('should handle elif branch', async () => {
    if (!ejs) throw new Error('EJS not loaded');
    
    const template = '{% if score > 90 %}A{% elif score > 80 %}B{% else %}C{% endif %}';
    
    const result1 = await processTemplate(template, { score: 95 }, { ejs });
    expect(result1).toContain('A');
    
    const result2 = await processTemplate(template, { score: 85 }, { ejs });
    expect(result2).toContain('B');
    
    const result3 = await processTemplate(template, { score: 70 }, { ejs });
    expect(result3).toContain('C');
  });
});

describe('defaultPreprocessorOptions', () => {
  it('should have correct default values', () => {
    expect(defaultPreprocessorOptions.escapeByDefault).toBe(false);
    expect(defaultPreprocessorOptions.simplifyControlFlow).toBe(true);
    expect(defaultPreprocessorOptions.delimiters).toEqual(['{{', '}}', '{%', '%}']);
  });
});
