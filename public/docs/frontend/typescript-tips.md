# TypeScript 常用技巧

## 泛型

泛型是 TypeScript 的核心特性之一：

```typescript
function identity<T>(arg: T): T {
  return arg;
}

// 使用
const result = identity<string>("hello");
```

## 类型守卫

```typescript
function isString(value: unknown): value is string {
  return typeof value === 'string';
}
```

## 工具类型

TypeScript 内置了多种工具类型：

- `Partial<T>` — 将所有属性变为可选
- `Required<T>` — 将所有属性变为必选
- `Pick<T, K>` — 从 T 中选取部分属性
- `Omit<T, K>` — 从 T 中排除部分属性
- `Record<K, T>` — 构建键值对类型

```typescript
interface User {
  id: number;
  name: string;
  email: string;
}

type UserPreview = Pick<User, 'id' | 'name'>;
```
