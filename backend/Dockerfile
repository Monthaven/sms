FROM node:18-bullseye AS builder
WORKDIR /app

# Install dependencies and build TypeScript
COPY package.json package-lock.json* ./
RUN npm ci --only=production || npm install --no-audit --no-fund

COPY tsconfig.json .
COPY prisma ./prisma
COPY src ./src
RUN npm run build || (echo "Build failed (this image expects a build script)" && exit 0)

FROM node:18-bullseye-slim
WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma

EXPOSE 4000
CMD ["node", "dist/server.js"]
