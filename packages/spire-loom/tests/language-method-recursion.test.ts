/**
 * LanguageMethod Recursion Test
 *
 * Captures a subtle bug where JSON.stringify on a language-enhanced method
 * causes infinite recursion through the variant getter properties.
 *
 * The Thread™ has hidden cycles. This test exposes them.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { LanguageMethod } from '../machinery/reed/method.js';
import { kotlinLanguage } from '../warp/kotlin.js';
import { createQueryAPI } from '../machinery/sley/query.js';
import type { MethodMetadata } from '../warp/metadata.js';

describe('LanguageMethod Recursion', () => {
  const mockMethod: MethodMetadata = {
    id: 'TestMgmt.testMethod',
    managementName: 'TestMgmt',
    name: 'testMethod',
    params: [
      { name: 'id', type: 'number', tsType: 'number' },
      { name: 'name', type: 'string', tsType: 'string' }
    ],
    returnType: 'void',
    isCollection: false,
    tags: ['crud:create']
  };

  it('should not recurse infinitely when accessing lang after clone', () => {
    const method = new LanguageMethod(mockMethod);
    
    // Set the language
    method.lang = kotlinLanguage;
    
    // Clone with the same language
    const cloned = method.cloneWithLang(kotlinLanguage);
    
    // Accessing lang should not trigger recursion
    expect(cloned.lang).toBe(kotlinLanguage);
  });

  it('should not recurse infinitely when stringifying a method', () => {
    const method = new LanguageMethod(mockMethod);
    method.lang = kotlinLanguage;

    // This was causing: Maximum call stack size exceeded
    expect(() => {
      JSON.stringify(method);
    }).not.toThrow();
  });

  it('should not recurse infinitely when stringifying methods from BoundQuery', () => {
    const methods = createQueryAPI(
      [new LanguageMethod(mockMethod)],
      'methods'
    );
    
    // Add language enhancement
    methods.addLang(kotlinLanguage);
    
    // Access the enhanced methods
    const enhanced = methods.all;
    
    // Stringifying the first method should not recurse
    expect(() => {
      JSON.stringify(enhanced[0]);
    }).not.toThrow();
  });

  it('should handle variant accessors without recursion', () => {
    const method = new LanguageMethod(mockMethod);
    method.lang = kotlinLanguage;

    // Access variant getters
    expect(() => {
      const asyncVariant = (method as any).async;
      // Stringifying the variant should also work
      if (asyncVariant) {
        JSON.stringify(asyncVariant);
      }
    }).not.toThrow();
  });

  it('should handle toJSON safely', () => {
    const method = new LanguageMethod(mockMethod);
    method.lang = kotlinLanguage;

    // If toJSON is implemented, it should not recurse
    if (typeof (method as any).toJSON === 'function') {
      expect(() => {
        const json = (method as any).toJSON();
        JSON.stringify(json);
      }).not.toThrow();
    }
  });
});
