---
title: Performance
---

## Performance

There's a lot of opportunity for performance improvements. The library originally started off favouring correctness, but it's now starting to switch to improving performance.

[View Issues](https://github.com/dsherret/ts-morph/labels/performance)


### Performance Tip: Analyze then Manipulate

If the code analysis is using types, symbols type checker, or program, then a large performance improvement can be gained by doing an initial analysis of the code first, then afterwards carrying out the manipulations.

For example, given the following code:

```ts setup: const sourceFiles: SourceFile[]; const someCheckOnSymbol: any;
for (const sourceFile of sourceFiles) {
    for (const classDec of sourceFile.getClasses()) {
        if (someCheckOnSymbol(classDec.getSymbolOrThrow()))
            classDec.remove();
    }
}
```

Write it this way instead:

```ts setup: const sourceFiles: SourceFile[]; const someCheckOnSymbol: any;
for (const classDec of getClassesToRemove())
    classDec.remove();

function getClassesToRemove() {
    const classesToRemove: ClassDeclaration[] = [];

    for (const sourceFile of sourceFiles) {
        for (const classDec of sourceFile.getClasses()) {
            if (someCheckOnSymbol(classDec.getSymbolOrThrow()))
                classesToRemove.push(classDec);
        }
    }

    return classesToRemove;
}
```

This is because the program is reset between manipulations.

### Tracking Nodes - Overview

This library makes manipulations easy for you by keeping track of how the underlying syntax tree changes between manipulations.

Behind the scenes, when you manipulate the AST:

1. A new source file is created using the TypeScript compiler.
2. The previously navigated nodes have their underlying compiler nodes replaced with the new compiler nodes.

It's why you can do this:

```ts
// sourcefile contains: interface Person { name: string; }
const personInterface = sourceFile.getInterfaceOrThrow("Person");
const nameProperty = personInterface.getPropertyOrThrow("name");
nameProperty.setType("number");
nameProperty.getText(); // "name: number;"
```

Instead of having to renavigate the tree after each manipulation:

```ts
// thankfully the library does not work this way
let personInterface = sourceFile.getInterfaceOrThrow("Person");
let nameProperty = personInterface.getPropertyOrThrow("name");
nameProperty.setType("number");
nameProperty.getText(); // "name: string;"
personInterface = sourceFile.getInterfaceOrThrow("Person");
nameProperty = personInterface.getPropertyOrThrow("name");
nameProperty.getText(); // "name: number;"
```

When thinking about performance, the key point here is that if you have a lot of previously navigated nodes and a very large file, then manipulation might start to become sluggish.

#### Forgetting Nodes (Advanced)

The main way to improve performance when manipulating, is to "forget" a node when you're done with it.

```ts setup: let personInterface: InterfaceDeclaration;
personInterface.forget();

// or to only forget a node's descendants that are currently in the wrapped cache
sourceFile.forgetDescendants();
```

That will stop tracking the node and all its previously navigated descendants (ex. in this case, `nameProperty` as well).
It won't be updated when manipulation happens again. Note that after doing this, the node will throw an error if one of its properties or methods is accessed.

#### Forget Blocks (Advanced)

It's possible to make sure all created nodes within a block are forgotten:

```ts
import { Project, NamespaceDeclaration, InterfaceDeclaration, ClassDeclaration } from "ts-morph";

const project = new Project();
const text = "namespace Namespace { interface Interface {} class Class {} }";
const sourceFile = project.createSourceFile("file.ts", text);

let namespaceDeclaration: NamespaceDeclaration;
let interfaceDeclaration: InterfaceDeclaration;
let classDeclaration: ClassDeclaration;

project.forgetNodesCreatedInBlock(remember => {
    namespaceDeclaration = sourceFile.getNamespaceOrThrow("Namespace");
    interfaceDeclaration = namespaceDeclaration.getInterfaceOrThrow("Interface");
    classDeclaration = namespaceDeclaration.getClassOrThrow("Class");

    // you can mark nodes to remember outside the scope of this block...
    // this will remember the specified node and all its ancestors
    remember(interfaceDeclaration); // or pass in multiple nodes
});

namespaceDeclaration.getText(); // ok, child was marked to remember
interfaceDeclaration.getText(); // ok, was explicitly marked to remember
classDeclaration.getText();     // throws, was forgotten
```

Also, do not be concerned about nesting forget blocks. That is perfectly fine to do:

```ts
project.forgetNodesCreatedInBlock(() => {
    namespaceDeclaration = sourceFile.getNamespaceOrThrow("Namespace");
    interfaceDeclaration = namespaceDeclaration.getInterfaceOrThrow("Interface");

    project.forgetNodesCreatedInBlock(remember => {
        classDeclaration = namespaceDeclaration.getClassOrThrow("Class");
        remember(namespaceDeclaration);
    });

    classDeclaration.getText();     // throws, was forgotten outside the block above
    interfaceDeclaration.getText(); // ok, hasn't been forgotten yet
});

namespaceDeclaration.getText(); // ok, was marked to remember in one of the blocks
interfaceDeclaration.getText(); // throws, was forgotten
classDeclaration.getText();     // throws, was forgotten
```

##### Async

This method supports async and await:

```ts
await project.forgetNodesCreatedInBlock(async remember => {
    // do stuff
});
```
