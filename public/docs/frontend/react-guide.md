# React 开发指南

## 简介

React 是一个用于构建用户界面的 JavaScript 库，由 Meta 维护。

## 核心概念

### 组件

React 应用由组件构成，每个组件负责渲染一部分 UI。

```tsx
import React from 'react';

interface GreetingProps {
  name: string;
}

const Greeting: React.FC<GreetingProps> = ({ name }) => {
  return <h1>Hello, {name}!</h1>;
};

export default Greeting;
```

### 状态管理

使用 `useState` 管理组件内部状态：

```tsx
const [count, setCount] = useState<number>(0);
```

### 副作用处理

使用 `useEffect` 处理副作用：

```tsx
useEffect(() => {
  document.title = `You clicked ${count} times`;
}, [count]);
```

## 最佳实践

1. 保持组件小而专注
2. 使用 TypeScript 进行类型检查
3. 合理使用 useMemo 和 useCallback
4. 遵循单一职责原则
