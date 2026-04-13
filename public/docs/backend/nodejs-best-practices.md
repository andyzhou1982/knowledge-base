# Node.js 最佳实践

## 错误处理

### 异步错误处理

```javascript
// 使用 async/await + try/catch
async function fetchData() {
  try {
    const response = await fetch('/api/data');
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Failed to fetch data:', error);
    throw error;
  }
}
```

## 性能优化

### 流处理

处理大文件时使用流（Stream）：

```javascript
const fs = require('fs');
const readStream = fs.createReadStream('large-file.txt');
const writeStream = fs.createWriteStream('output.txt');

readStream.pipe(writeStream);
```

### 集群模式

利用多核 CPU：

```javascript
const cluster = require('cluster');
const os = require('os');

if (cluster.isPrimary) {
  const cpus = os.cpus().length;
  for (let i = 0; i < cpus; i++) {
    cluster.fork();
  }
}
```

## 安全

- 始终验证用户输入
- 使用 helmet 中间件设置安全头
- 启用 CORS 并限制来源
- 使用环境变量管理敏感配置
