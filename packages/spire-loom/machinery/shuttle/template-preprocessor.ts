/**
 * Template Preprocessor
 *
 * Converts custom, readable template syntax to standard EJS.
 * Provides control flow simplification and whitespace management.
 */

export interface PreprocessorOptions {
  /** Whether to enable HTML escaping by default (default: false for code gen) */
  escapeByDefault?: boolean;
  /** Whether to enable control flow simplification (default: true) */
  simplifyControlFlow?: boolean;
  /** Custom delimiters to use (default: ['{{', '}}', '{%', '%}']) */
  delimiters?: [string, string, string, string];
}

/**
 * Default preprocessor options
 */
export const defaultPreprocessorOptions: Required<PreprocessorOptions> = {
  escapeByDefault: false,
  simplifyControlFlow: true,
  delimiters: ['{{', '}}', '{%', '%}'],
};

/**
 * Check if code block contains JavaScript braces.
 * If it does, we skip control flow simplification.
 */
function hasJavaScriptBraces(code: string): boolean {
  // Check for { or } that would indicate raw JavaScript
  return /[{}]/.test(code);
}

/**
 * Preprocess custom delimiters to EJS format.
 *
 * CONTROL FLOW SIMPLIFICATION:
 * Works only on blocks WITHOUT braces - if you write raw JS like `{% if (x) { %}`,
 * we leave it alone. But `{% if x %}` gets transformed to `<%_ if (x) { _%>`.
 *
 * - {% if condition %}      → <%_ if (condition) { _%>
 * - {% elif condition %}    → <%_ } else if (condition) { _%>
 * - {% else if condition %} → <%_ } else if (condition) { _%>
 * - {% else %}              → <%_ } else { _%>
 * - {% endif %}             → <%_ } _%>
 * - {% for item in items %} → <%_ for (const item of items) { _%>
 * - {% for i=0; i<n; i++ %} → <%_ for (let i=0; i<n; i++) { _%>
 * - {% endfor %}            → <%_ } _%>
 * - {% while condition %}   → <%_ while (condition) { _%>
 * - {% endwhile %}          → <%_ } _%>
 *
 * WHITESPACE PHILOSOPHY: Trim by default, explicitly preserve with +
 * - {% code %}      → <% code _%>     (trim trailing - DEFAULT)
 * - {%+ code %}     → <% code %>      (preserve whitespace)
 *
 * OUTPUT VARIANTS:
 * - {{ expr }}      → <%- expr %>     (unescaped output)
 * - {h expr }       → <%= expr %>     (html escaped)
 * - {_ expr }       → <%- expr _%>    (trim trailing)
 * - {h_ expr }      → <%= expr _%>    (html + trim trailing)
 * - {_ expr _h}     → <%-_ expr _%>   (trim both + html)
 * - {{_ expr _}}    → <%-_ expr -%>   (trim both, unescaped)
 */
export function preprocessTemplate(
  template: string,
  options: PreprocessorOptions = {}
): string {
  const opts = { ...defaultPreprocessorOptions, ...options };
  const [outOpen, outClose, codeOpen, codeClose] = opts.delimiters;
  
  let result = template;
  
  // === CONTROL FLOW SIMPLIFICATION ===
  // Must run BEFORE standard {% %} processing
  if (opts.simplifyControlFlow) {
    result = simplifyControlFlow(result, codeOpen, codeClose);
  }
  
  // === WHITESPACE-TRIMMED OUTPUT VARIANTS ===
  // Process most specific patterns first
  
  // {{_ expr _}} → trim both sides (unescaped)
  // Must come before {_ expr } to avoid partial match
  result = result.replace(
    new RegExp(escapeRegex(outOpen) + '_\\s*([\\s\\S]*?)\\s*_' + escapeRegex(outClose), 'g'),
    '<%-_ $1 _%>'
  );
  
  // {_ expr _h} → trim both + html escaped
  result = result.replace(
    /\{_\s*([\s\S]*?)\s*_h\}/g,
    '<%=_ $1 _%>'
  );
  
  // {_ expr } → trim trailing only
  result = result.replace(
    /\{_\s*([\s\S]*?)\s*\}/g,
    '<%-_ $1 %>'
  );
  
  // {h_ expr } → html + trim trailing
  result = result.replace(
    /\{h_\s*([\s\S]*?)\s*\}/g,
    '<%=_ $1 %>'
  );
  
  // === STANDARD OUTPUT FORMS ===
  
  // {h expr } → html escaped output
  result = result.replace(
    /\{h\s*([\s\S]*?)\s*\}/g,
    '<%= $1 %>'
  );
  
  // {{ expr }} → unescaped output (default for code generation)
  const outputRegex = new RegExp(
    escapeRegex(outOpen) + '\\s*([\\s\\S]*?)\\s*' + escapeRegex(outClose),
    'g'
  );
  result = result.replace(
    outputRegex,
    opts.escapeByDefault ? '<%= $1 %>' : '<%- $1 %>'
  );
  
  // === CODE BLOCKS ===
  // Whitespace trimming is DEFAULT
  
  // {%+ code %} → preserve whitespace (explicit opt-in)
  const codePreserveRegex = new RegExp(
    escapeRegex(codeOpen) + '\\+\\s*([\\s\\S]*?)\\s*' + escapeRegex(codeClose),
    'g'
  );
  result = result.replace(codePreserveRegex, '<% $1 %>');
  
  // {% code %} → trim trailing whitespace (default)
  const codeRegex = new RegExp(
    escapeRegex(codeOpen) + '\\s*([\\s\\S]*?)\\s*' + escapeRegex(codeClose),
    'g'
  );
  result = result.replace(codeRegex, '<% $1 _%>');
  
  return result;
}

/**
 * Simplify control flow syntax to JavaScript.
 * 
 * TWO-STAGE APPROACH:
 * 1. For each {% ... %} block, check if it contains { or } (raw JS)
 * 2. If NO braces: apply simplified syntax transformation
 * 3. If HAS braces: leave untouched (will be processed as raw EJS)
 */
function simplifyControlFlow(
  template: string,
  codeOpen: string,
  codeClose: string
): string {
  const open = escapeRegex(codeOpen);
  const close = escapeRegex(codeClose);
  
  // Match all {% ... %} blocks
  const codeBlockRegex = new RegExp(
    open + '([\\s\\S]*?)' + close,
    'g'
  );
  
  return template.replace(codeBlockRegex, (match, content) => {
    const trimmed = content.trim();
    
    // Stage 1: Check if already JavaScript (has braces)
    if (hasJavaScriptBraces(trimmed)) {
      // Leave as-is - will be processed as raw EJS
      return match;
    }
    
    // Stage 2: Apply simplified syntax transformations
    
    // endif / endfor / endwhile → <%_ } _%>
    if (/^endif$/.test(trimmed)) {
      return '<%_ } _%>';
    }
    if (/^endfor$/.test(trimmed)) {
      return '<%_ } _%>';
    }
    if (/^endwhile$/.test(trimmed)) {
      return '<%_ } _%>';
    }
    
    // else → <%_ } else { _%>
    if (/^else$/.test(trimmed)) {
      return '<%_ } else { _%>';
    }
    
    // else if condition → <%_ } else if (condition) { _%>
    const elseIfMatch = trimmed.match(/^else\s+if\s+(.+)$/);
    if (elseIfMatch) {
      return `<%_ } else if (${elseIfMatch[1]}) { _%>`;
    }
    
    // elif condition → <%_ } else if (condition) { _%>
    const elifMatch = trimmed.match(/^elif\s+(.+)$/);
    if (elifMatch) {
      return `<%_ } else if (${elifMatch[1]}) { _%>`;
    }
    
    // while condition → <%_ while (condition) { _%>
    const whileMatch = trimmed.match(/^while\s+(.+)$/);
    if (whileMatch) {
      return `<%_ while (${whileMatch[1]}) { _%>`;
    }
    
    // for item in items → <%_ for (const item of items) { _%>
    const forInMatch = trimmed.match(/^for\s+(\w+)\s+in\s+(.+)$/);
    if (forInMatch) {
      return `<%_ for (const ${forInMatch[1]} of ${forInMatch[2]}) { _%>`;
    }
    
    // for i=0; i<n; i++ → <%_ for (let i=0; i<n; i++) { _%>
    // Classic for loop syntax (anything else starting with "for ")
    const forMatch = trimmed.match(/^for\s+(.+)$/);
    if (forMatch) {
      return `<%_ for (${forMatch[1]}) { _%>`;
    }
    
    // if condition → <%_ if (condition) { _%>
    const ifMatch = trimmed.match(/^if\s+(.+)$/);
    if (ifMatch) {
      return `<%_ if (${ifMatch[1]}) { _%>`;
    }
    
    // No match - leave as-is
    return match;
  });
}

/**
 * Escape special regex characters in a string
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Post-process EJS output to clean up any artifacts.
 */
export function postprocessOutput(output: string): string {
  // Remove trailing whitespace on lines
  return output
    .split('\n')
    .map(line => line.trimEnd())
    .join('\n');
}

/**
 * Full template processing pipeline.
 * Preprocesses template, renders with EJS, postprocesses output.
 */
export async function processTemplate(
  template: string,
  data: Record<string, unknown>,
  options: PreprocessorOptions & { ejs?: typeof import('ejs') } = {}
): Promise<string> {
  const { ejs: ejsLib, ...preprocessorOptions } = options;
  
  if (!ejsLib) {
    throw new Error('EJS library required for template processing');
  }
  
  // Preprocess: custom syntax → EJS
  const processedTemplate = preprocessTemplate(template, preprocessorOptions);
  
  // Render with EJS
  const rendered = ejsLib.render(processedTemplate, data, {
    beautify: true,
    escape: (str: string) => str,
  });
  
  // Postprocess: cleanup
  return postprocessOutput(rendered);
}
