# ---- 构建阶段 ----
FROM node:20-alpine AS build
WORKDIR /app

# 先装依赖，利用层缓存
COPY package.json package-lock.json ./
RUN npm ci

# 拷贝源码并构建（tsc 严格类型检查 + vite 生产构建）
COPY . .
RUN npm run build

# ---- 运行阶段：静态托管 SPA ----
FROM nginx:stable-alpine AS serve
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
HEALTHCHECK --interval=10s --timeout=3s --retries=5 \
  CMD wget -qO- http://localhost/ >/dev/null 2>&1 || exit 1
CMD ["nginx", "-g", "daemon off;"]
