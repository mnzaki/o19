/**
 * Spec Resolver
 *
 * Abstracts the common pattern of accepting specs that can be:
 * - A single spec
 * - An array of specs
 * - A function returning a spec or array
 * - A function returning undefined (filtered out)
 *
 * Used by outputs, patches, and hookups in treadle definitions.
 *
 * @example
 * ```typescript
 * const outputs: Array<SpecOrFn<OutputSpec, GeneratorContext>> = [
 *   { template: 'foo.ts.ejs', path: 'foo.ts', language: 'typescript' },
 *   (ctx) => ctx.methods.has('admin') ? { template: 'admin.ts.ejs', ... } : undefined,
 *   (ctx) => [{ ... }, { ... }] // return array
 * ];
 *
 * const resolved = resolveSpecs(outputs, context);
 * ```
 */

/**
 * A spec item, an array of specs, or a function returning either.
 * The standard pattern for treadle-kit specs (outputs, patches, hookups).
 */
export type SpecOrFn<T, C> =
  | T
  | T[]
  | ((context: C) => T | T[] | undefined);

/**
 * Resolve a single spec that may be:
 * - A single spec
 * - An array of specs
 * - A function returning a spec or array
 * - A function returning undefined (filtered out)
 *
 * @param specOrFn The spec, array, or function to resolve
 * @param context Context passed to functions
 * @returns Flattened array of resolved specs
 */
export function resolveSpec<T, C>(
  specOrFn: SpecOrFn<T, C>,
  context: C
): T[] {
  if (typeof specOrFn === 'function') {
    const result = (specOrFn as (context: C) => T | T[] | undefined)(context);
    if (result === undefined) return [];
    return Array.isArray(result) ? result : [result];
  }
  if (Array.isArray(specOrFn)) {
    return specOrFn;
  }
  return [specOrFn];
}

/**
 * Resolve multiple specs in order, flattening all results.
 *
 * @param specs Array of specs, arrays, or functions
 * @param context Context passed to functions
 * @returns Flattened array of all resolved specs
 */
export function resolveSpecs<T, C>(
  specs: Array<SpecOrFn<T, C>>,
  context: C
): T[] {
  return specs.flatMap(s => resolveSpec(s, context));
}

/**
 * A spec that may have a condition function.
 */
export interface ConditionalSpec<C> {
  condition?(context: C): boolean;
}

/**
 * Resolve specs and filter by condition if present.
 * Used for hookups with `condition` field.
 *
 * @param specs Array of specs that may have condition functions
 * @param context Context passed to functions and conditions
 * @returns Filtered, flattened array of resolved specs
 */
export function resolveSpecsWithCondition<
  T extends ConditionalSpec<C>,
  C
>(
  specs: Array<SpecOrFn<T, C>>,
  context: C
): T[] {
  return resolveSpecs(specs, context).filter(
    spec => !spec.condition || spec.condition(context)
  );
}

/**
 * Resolve specs with a custom filter function.
 *
 * @param specs Array of specs
 * @param context Context passed to functions
 * @param filter Filter function called on each resolved spec
 * @returns Filtered, flattened array of resolved specs
 */
export function resolveSpecsWithFilter<T, C>(
  specs: Array<SpecOrFn<T, C>>,
  context: C,
  filter: (spec: T, context: C) => boolean
): T[] {
  return resolveSpecs(specs, context).filter(
    spec => filter(spec, context)
  );
}
