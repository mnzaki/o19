import { ExternalLayer } from './imprint.js';

export function Mutex<T extends (...args: any[]) => any>(
  target?: T,
  context?: ClassFieldDecoratorContext
): T {
  if (target === undefined) {
    // @ts-ignore hack to allow using with or without calling the decorator
    return Mutex;
  }

  // TODO: wrap with metadata about being a rust value wrapped in a Mutex
  return target;
}

export function Option<T extends (...args: any[]) => any>(
  target?: T,
  context?: ClassFieldDecoratorContext
): T {
  if (target === undefined) {
    // @ts-ignore hack to allow using with or without calling the decorator
    return Option;
  }
  // TODO: wrap with metadata about being a rust value wrapped in an Option
  return target;
}

export class RustExternalLayer extends ExternalLayer {}

export class RustMethod {
  constructor(
    public params: RustDataType[],
    public returnType: RustDataType | RustExternalLayer
  ) {}
}

export class RustDataType {
  constructor(public rustType: string) {}
}

/**
 * TODO
 * Return a new class that extends RustExternalLayer and stores a reference to the input class
 *
 * Walk the class prototype, if we find another RustExternalLayer subclass as a property, also make it static memeber
 *
 * Walk the given Management class prototype looking for functions. Redefine them as static properties holding RustMethod instances on the new class being built
 * and if we find a basic data type property, make a static version that is a RustDataType instance,
 *
 * point is later we wanna be able to say things like `@rust.link(Somestruct)`
 * and maybe later link to particular methods
 */
export function Struct<T extends new (...args: any[]) => any>(
  target?: T,
  context?: ClassDecoratorContext<T>
): T {
  if (target === undefined) {
    // @ts-ignore hack to allow using with or without calling the decorator
    return Struct;
  }

  return target;
}
