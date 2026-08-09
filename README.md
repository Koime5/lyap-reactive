# ⚡ `@lyapjs/reactive`


## 📥 Installation

```bash
npm install @lyapjs/reactive
# or
yarn add @lyapjs/reactive
# or
pnpm add @lyapjs/reactive
```

---

## ⚡ Quickstart

```typescript
import { signal, computed, effect, watch, batch, untrack, onCleanup, createScope } from "@lyapjs/reactive";

// 1. Create a Reactive Signal
const count = signal(0);

// 2. Create a Lazy Derived Computed Signal
const double = computed(() => count.value * 2);

// 3. Create a Side Effect Observer
effect(() => {
    console.log(`Count: ${count.value}, Double: ${double.value}`);

    // Register teardown hook
    onCleanup(() => {
        console.log("Cleaning up previous effect run...");
    });
});

// 4. Update State
count.set(1);

// 5. Watch for Specific Changes
watch(count, (newVal, oldVal) => {
    console.log(`Count changed from ${oldVal} to ${newVal}`);
});

// 6. Group Multiple Writes Atomically
batch(() => {
    count.set(2);
    count.set(3);
});
```

---

## 📖 API Reference

### `signal<T>(initialValue: T): Signal<T>`
Creates a state signal holding a value.

```typescript
import { signal } from "@lyapjs/reactive";

const name = signal("Alice");

// Read value
console.log(name.value); // "Alice"

// Update value (notifies observers if value changed via Object.is equality)
name.set("Bob");
name.value = "Charlie"; // Property setter alias
```

---

### `computed<T>(getter: () => T): ReadonlySignal<T>`
Creates a lazy computed signal. Computeds execute lazily on read and cache their result. If the return value does not change, downstream effects skip execution.

```typescript
import { signal, computed } from "@lyapjs/reactive";

const firstName = signal("John");
const lastName = signal("Doe");

const fullName = computed(() => `${firstName.value} ${lastName.value}`);

console.log(fullName.value); // "John Doe"
```

---

### `effect(fn: (onCleanup) => void, options?: EffectOptions): () => void`
Creates an immediate reactive side effect that tracks any signals or computeds read during execution and re-runs when they update. Returns a disposer function.

```typescript
import { signal, effect } from "@lyapjs/reactive";

const count = signal(0);

const dispose = effect((onCleanup) => {
    console.log(`Current count: ${count.value}`);

    onCleanup(() => {
        console.log("Tearing down effect...");
    });
});

// Manually stop effect
dispose();
```

---

### `watch<T>(source, callback, options?: WatchOptions): () => void`
Watches a signal, computed, or getter expression and invokes a callback when the value changes.

```typescript
import { signal, watch } from "@lyapjs/reactive";

const count = signal(0);

// Lazy Watch (fires only when value changes)
watch(count, (newVal, oldVal, onCleanup) => {
    console.log(`Updated from ${oldVal} to ${newVal}`);
});

// Immediate Watch (fires immediately on creation with oldVal = undefined)
watch(count, (newVal, oldVal) => {
    console.log(`Immediate value: ${newVal}`);
}, { immediate: true });
```

---

### `batch<T>(fn: () => T): T`
Groups multiple signal updates into a single atomic transaction. Flushes effect queues once at the end of the batch closure.

```typescript
import { signal, effect, batch } from "@lyapjs/reactive";

const a = signal(0);
const b = signal(0);

effect(() => console.log(`Sum: ${a.value + b.value}`));

batch(() => {
    a.set(10);
    b.set(20);
});
// Effect runs ONLY ONCE at the end of the batch!
```

---

### `untrack<T>(fn: () => T): T`
Executes a closure without tracking any signals or computeds read within its scope.

```typescript
import { signal, effect, untrack } from "@lyapjs/reactive";

const a = signal(1);
const b = signal(100);

effect(() => {
    const trackedVal = a.value;
    const untrackedVal = untrack(() => b.value);
    console.log(trackedVal, untrackedVal);
});

b.set(200); // Will NOT trigger the effect!
```

---

### `onCleanup(fn: () => void): void`
Registers a teardown callback for the currently executing effect. Can be called anywhere inside an effect body. Multiple `onCleanup` hooks are automatically chained in FIFO order.

```typescript
import { effect, onCleanup } from "@lyapjs/reactive";

effect(() => {
    const timer = setInterval(doWork, 1000);
    onCleanup(() => clearInterval(timer));
});
```

---

### `createScope<T>(fn: (scope: Scope) => T): { result: T; scope: Scope }`
Creates a hierarchical owner scope. Any effects created inside `createScope` automatically register their disposers with the scope. Calling `scope.dispose()` tears down all child effects and nested scopes at once.

```typescript
import { signal, effect, createScope } from "@lyapjs/reactive";

const count = signal(0);

const { scope } = createScope(() => {
    effect(() => { console.log(count.value); });
});

// Disposes all child effects automatically!
scope.dispose();
```

---

## 📄 License

[MIT](./LICENSE) © 2026 Thurein Soe
