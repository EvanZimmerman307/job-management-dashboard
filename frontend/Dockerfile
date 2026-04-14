# Stage 1: shared base — install deps and copy source
FROM node:20-alpine AS base
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .

# Stage 2: test runner — CMD so it runs at container start, not build time
FROM base AS tester
CMD ["npm", "test"]

# Stage 3: build the static assets
FROM base AS builder
RUN npm run build

# Stage 4: serve with nginx
FROM nginx:1.25-alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
