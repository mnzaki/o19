/**
 * Query Serializer
 *
 * "Serialize query lambdas for midstage execution."
 *
 * This module handles the tricky problem of getting query lambdas
 * from loom/*.ts files into the midstage for execution.
 */

import type { QueryMetadata } from '../warp/crud.js';

export interface SerializedQuery {
  /** Original class name */
  className: string;

  /** Original method name */
  methodName: string;

  /** Source file path */
  filePath: string;

  /** Serialized query function as string */
  queryFnSource: string;

  /** Whether the function is an arrow function */
  isArrowFunction: boolean;

  /** Parameter name (usually 'prisma') */
  paramName: string;
}

/**
 * Serialize a query lambda function to a string.
 *
 * This uses Function.prototype.toString() to get the source code.
 * Note: This won't work if the code is minified or transpiled in a way
 * that changes function.toString() output.
 */
export function serializeQuery(queryMeta: QueryMetadata): SerializedQuery | null {
  const queryFn = queryMeta.queryFn;
  if (!queryFn) {
    return null;
  }

  // Get the function source
  let queryFnSource = queryFn.toString();

  // Parse to detect if arrow function and get param name
  const arrowMatch = queryFnSource.match(/^\((\w+)\)\s*=>/);
  const functionMatch = queryFnSource.match(/^function\s*(?:\w*)?\s*\((\w+)\)/);

  let isArrowFunction = false;
  let paramName = 'prisma';

  if (arrowMatch) {
    isArrowFunction = true;
    paramName = arrowMatch[1];
  } else if (functionMatch) {
    isArrowFunction = false;
    paramName = functionMatch[1];
  }

  return {
    className: queryMeta.methodName, // Will be set by collector
    methodName: queryMeta.methodName,
    filePath: '', // Will be set by collector
    queryFnSource,
    isArrowFunction,
    paramName,
  };
}

/**
 * Deserialize a query function for execution.
 *
 * WARNING: This uses eval() which can be dangerous if the source
 * is not trusted. In our case, the source comes from the user's
 * own loom files, so it's trusted.
 */
export function deserializeQuery(serialized: SerializedQuery): Function {
  // Wrap in a function that takes the prisma client as parameter
  const wrappedSource = `
    (function(${serialized.paramName}) {
      return (${serialized.queryFnSource})(${serialized.paramName});
    })
  `;

  // eslint-disable-next-line no-eval
  return eval(wrappedSource);
}

/**
 * Generate midstage code that defines all query functions.
 *
 * This creates a TypeScript file that can be imported and executed
 * in the midstage, with all query lambdas reconstructed.
 */
export function generateMidstageQueries(
  queries: SerializedQuery[],
  options: {
    importPath?: string;
    clientType?: string;
  } = {}
): string {
  const { importPath = '@prisma/client', clientType = 'PrismaClient' } = options;

  let code = `// Auto-generated query definitions for midstage execution
import { ${clientType} } from '${importPath}';

export interface QueryDef {
  name: string;
  className: string;
  execute: (client: ${clientType}) => Promise<unknown>;
}

export const QUERIES: QueryDef[] = [
`;

  for (const query of queries) {
    code += `  {
    name: '${query.methodName}',
    className: '${query.className}',
    execute: async (prisma: ${clientType}) => {
      return (${query.queryFnSource})(prisma);
    },
  },
`;
  }

  code += `];

export default QUERIES;
`;

  return code;
}

/**
 * Safely check if a string looks like a valid function source.
 */
export function isValidFunctionSource(source: string): boolean {
  // Basic checks - must contain arrow or function keyword
  const hasArrow = source.includes('=>');
  const hasFunction = source.startsWith('function');

  // Must have balanced parentheses
  const openParens = (source.match(/\(/g) || []).length;
  const closeParens = (source.match(/\)/g) || []).length;
  const balancedParens = openParens === closeParens;

  // Must have balanced braces
  const openBraces = (source.match(/{/g) || []).length;
  const closeBraces = (source.match(/}/g) || []).length;
  const balancedBraces = openBraces === closeBraces;

  return (hasArrow || hasFunction) && balancedParens && balancedBraces;
}
