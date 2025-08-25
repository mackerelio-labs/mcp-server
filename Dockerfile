FROM node:22 AS builder
WORKDIR /app

COPY package.json .
COPY package-lock.json .
COPY tsconfig.json .
COPY tsdown.config.ts .

RUN npm ci

COPY src/ ./src/

RUN npm run build

FROM node:22-alpine3.21

WORKDIR /app

RUN addgroup -S appgroup && adduser -S appuser -G appgroup

# Copy built files from builder stage
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/build/ ./build/

RUN npm ci --omit=dev && npm cache clean --force

# Set proper permissions
RUN chown -R appuser:appgroup /app

USER appuser
ENV NODE_ENV=production

ENTRYPOINT ["node", "build/index.js"]
