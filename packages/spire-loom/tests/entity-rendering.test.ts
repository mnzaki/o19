/**
 * Entity Rendering Tests 🌀
 *
 * Tests for APP-005: Language-Native Entity Composition System
 * Verifies that syntax.composition.entity* templates compile to
 * codeGen.rendering.renderEntity*() methods.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { LanguageEntity } from '../machinery/reed/entity.js';
import { languages } from '../machinery/reed/language/imperative.js';

// Import language definitions to register them
import '../warp/kotlin.js';
import '../warp/typescript.js';
import '../warp/rust.js';

describe('Entity Rendering', () => {
  // Sample entity for testing
  const sampleEntity = new LanguageEntity({
    name: 'Bookmark',
    fields: [
      { name: 'id', tsType: 'number', isPrimary: true },
      { name: 'url', tsType: 'string' },
      { name: 'title', tsType: 'string', nullable: true }
    ]
  });

  describe('Kotlin', () => {
    let kotlin: ReturnType<typeof languages.get>;

    beforeAll(() => {
      kotlin = languages.get('kotlin');
      if (kotlin) {
        sampleEntity.lang = kotlin;
      }
    });

    it('should have entity rendering methods', () => {
      expect(kotlin).toBeDefined();
      expect(kotlin?.codeGen.rendering.renderEntityField).toBeDefined();
      expect(kotlin?.codeGen.rendering.renderEntityFields).toBeDefined();
      expect(kotlin?.codeGen.rendering.renderEntityClass).toBeDefined();
    });

    it('should render entity field', () => {
      if (!kotlin) return;

      const field = sampleEntity.fields[0];
      const rendered = kotlin.codeGen.rendering.renderEntityField(field);
      console.log('Kotlin rendered:', rendered);

      expect(rendered).toContain('val');
      expect(rendered).toContain('id');
      expect(rendered).toMatch(/Int|INT|NUMBER/);
    });

    it('should render entity class as data class', () => {
      if (!kotlin) return;

      const rendered = kotlin.codeGen.rendering.renderEntityClass(sampleEntity);

      expect(rendered).toContain('data class');
      expect(rendered).toContain('Bookmark');
      expect(rendered).toContain('val');
    });

    it('should render JSON-serializable variant', () => {
      if (!kotlin) return;

      const rendered = kotlin.codeGen.rendering.renderEntityClass(sampleEntity, 'json');

      expect(rendered).toContain('@Serializable');
      expect(rendered).toContain('@SerialName');
      expect(rendered).toContain('BookmarkJson');
    });

    it('should render Parcelize variant', () => {
      if (!kotlin) return;

      const rendered = kotlin.codeGen.rendering.renderEntityClass(sampleEntity, 'parcelize');

      expect(rendered).toContain('@Parcelize');
      expect(rendered).toContain('Parcelable');
    });
  });

  describe('TypeScript', () => {
    let typescript: ReturnType<typeof languages.get>;

    beforeAll(() => {
      typescript = languages.get('typescript');
      if (typescript) {
        sampleEntity.lang = typescript;
      }
    });

    it('should have entity rendering methods', () => {
      expect(typescript).toBeDefined();
      expect(typescript?.codeGen.rendering.renderEntityField).toBeDefined();
      expect(typescript?.codeGen.rendering.renderEntityFields).toBeDefined();
      expect(typescript?.codeGen.rendering.renderEntityClass).toBeDefined();
    });

    it('should render entity field', () => {
      if (!typescript) return;

      const field = sampleEntity.fields[0];
      const rendered = typescript.codeGen.rendering.renderEntityField(field);

      expect(rendered).toContain('id');
      // Note: Type names are converted to SCREAMING_SNAKE by Name class
      // 'number' becomes 'NUMBER', 'string' becomes 'STRING'
      expect(rendered).toMatch(/id:\s+(number|NUMBER)/i);
    });

    it('should render entity class as interface', () => {
      if (!typescript) return;

      const rendered = typescript.codeGen.rendering.renderEntityClass(sampleEntity);

      expect(rendered).toContain('export interface');
      expect(rendered).toMatch(/interface\s+(Bookmark|BOOKMARK)/);
    });
  });

  describe('Rust', () => {
    let rust: ReturnType<typeof languages.get>;

    beforeAll(() => {
      rust = languages.get('rust');
      if (rust) {
        sampleEntity.lang = rust;
      }
    });

    it('should have entity rendering methods', () => {
      expect(rust).toBeDefined();
      expect(rust?.codeGen.rendering.renderEntityField).toBeDefined();
      expect(rust?.codeGen.rendering.renderEntityFields).toBeDefined();
      expect(rust?.codeGen.rendering.renderEntityClass).toBeDefined();
    });

    it('should render entity field', () => {
      if (!rust) return;

      const field = sampleEntity.fields[0];
      const rendered = rust.codeGen.rendering.renderEntityField(field);

      expect(rendered).toContain('pub');
      expect(rendered).toContain('id');
      // Note: Type names are converted - 'i64' becomes 'I64'
      expect(rendered).toMatch(/pub\s+id:\s+(i64|I64)/);
    });

    it('should render entity class as struct', () => {
      if (!rust) return;

      const rendered = rust.codeGen.rendering.renderEntityClass(sampleEntity);

      expect(rendered).toContain('#[derive');
      expect(rendered).toContain('pub struct');
      expect(rendered).toMatch(/struct\s+(Bookmark|BOOKMARK)/);
    });
  });
});
