/**
 * Language Signature Rendering Test
 *
 * Reproduces a bug where method.signature contains characters that break EJS
 * when used inside another template (like android/aidl_interface.aidl.mejs).
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { LanguageMethod } from '../machinery/reed/method.js';
import { kotlinLanguage } from '../warp/kotlin.js';
import { mejs } from '../machinery/bobbin/mejs.js';
import type { MethodMetadata } from '../warp/metadata.js';

describe('Language Method Signature Rendering', () => {
  const mockMethod: MethodMetadata = {
    id: 'TestMgmt.testMethod',
    managementName: 'TestMgmt',
    name: 'testMethod',
    params: [
      { name: 'url', type: 'string', tsType: 'string' },
      { name: 'title', type: 'string', tsType: 'string', optional: true }
    ],
    returnType: 'void',
    isCollection: false,
    tags: ['crud:create'],
    crudOperation: 'create'
  };

  it('should render method.signature without EJS-breaking characters', () => {
    const method = new LanguageMethod(mockMethod);
    method.lang = kotlinLanguage;

    // Get the signature
    const signature = method.signature;
    console.log('Rendered signature:', signature);

    // The signature should not contain unescaped EJS control characters
    // that would break when used inside another EJS template
    expect(signature).not.toMatch(/<%/);  // Would start EJS tag
    expect(signature).not.toMatch(/%>/);  // Would end EJS tag
    expect(signature).not.toMatch(/\{%-/); // Would be EJS unescaped output
  });

  it('should be usable inside another MEJS template', () => {
    const method = new LanguageMethod(mockMethod);
    method.lang = kotlinLanguage;

    // Template that uses method.signature (like aidl_interface.aidl.mejs)
    const outerTemplate = `
interface ITestService {
    {{ method.signature }};
}
`;

    // This should not throw
    expect(() => {
      const result = mejs.renderTemplate(outerTemplate, { method });
      console.log('Rendered template:', result);
      return result;
    }).not.toThrow();
  });

  it('should handle complex method with variants', () => {
    const method = new LanguageMethod(mockMethod);
    method.lang = kotlinLanguage;
    method.addVariance('suspend');

    const signature = method.signature;
    console.log('Async signature:', signature);

    // Should still be usable in templates
    const outerTemplate = `{{ method.signature }};`;
    
    expect(() => {
      mejs.renderTemplate(outerTemplate, { method });
    }).not.toThrow();
  });

  it('should render AIDL-compatible signature', () => {
    // AIDL methods need specific format: "ReturnType methodName(Params)"
    const aidlMethod: MethodMetadata = {
      id: 'BookmarkMgmt.addBookmark',
      managementName: 'BookmarkMgmt',
      name: 'addBookmark',
      params: [
        { name: 'url', type: 'String', tsType: 'string' },
        { name: 'title', type: 'String', tsType: 'string' }
      ],
      returnType: 'void',
      isCollection: false,
      tags: ['crud:create']
    };

    const method = new LanguageMethod(aidlMethod);
    method.lang = kotlinLanguage;

    // Simulate AIDL template usage
    const aidlTemplate = `
interface IRadicleService {
    {{ method.signature }};
}
`;

    console.log('AIDL template input:', aidlTemplate);
    console.log('Method context:', {
      signature: method.signature,
      name: method.name,
      returnType: method.returnType
    });

    expect(() => {
      const result = mejs.renderTemplate(aidlTemplate, { method });
      console.log('Rendered AIDL:', result);
      return result;
    }).not.toThrow();
  });
});
