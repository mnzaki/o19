function Mutex<T>(target: T, context: ClassFieldDecoratorContext) {
  console.log({ target, context });
  context.addInitializer(function () {
    console.log({ this: this });
  });
}

class Bar {}
class Foo {
  @Mutex
  bar = new Bar();
}

new Foo();
