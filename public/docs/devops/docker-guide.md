# Docker 入门指南

## 基本概念

Docker 使用容器化技术，将应用及其依赖打包到一个可移植的容器中。

### 镜像与容器

- **镜像 (Image)**：只读模板，包含运行应用所需的所有内容
- **容器 (Container)**：镜像的运行实例

## 常用命令

```bash
# 构建镜像
docker build -t my-app .

# 运行容器
docker run -d -p 3000:3000 my-app

# 查看运行中的容器
docker ps

# 停止容器
docker stop <container_id>

# 查看日志
docker logs <container_id>
```

## Dockerfile 示例

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3000
CMD ["node", "server.js"]
```

## Docker Compose

用于定义和运行多容器应用：

```yaml
version: '3.8'
services:
  web:
    build: .
    ports:
      - "3000:3000"
  db:
    image: postgres:15
    environment:
      POSTGRES_PASSWORD: secret
```
