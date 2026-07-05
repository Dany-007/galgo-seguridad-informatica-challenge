# --- Etapa 1: build ---
FROM node:22-alpine AS builder
WORKDIR /app
# Prisma necesita libssl para detectar la version de OpenSSL en Alpine (musl).
RUN apk add --no-cache openssl

COPY package.json package-lock.json* ./
RUN npm install

COPY prisma ./prisma
RUN npx prisma generate

COPY tsconfig.json ./
COPY src ./src
RUN npm run build

# --- Etapa 2: dependencias de produccion ---
FROM node:22-alpine AS prod-deps
WORKDIR /app
RUN apk add --no-cache openssl
COPY package.json package-lock.json* ./
RUN npm install --omit=dev
COPY prisma ./prisma
RUN npx prisma generate

# --- Etapa 3: runtime (imagen minima, usuario no root) ---
FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
RUN apk add --no-cache openssl

# Usuario sin privilegios (principio de menor privilegio, evita root dentro del contenedor).
RUN addgroup -S galo && adduser -S galo -G galo

COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=prod-deps /app/prisma ./prisma
COPY --from=builder /app/dist ./dist
COPY public ./public
COPY openapi.yaml ./openapi.yaml
COPY package.json ./package.json

RUN chown -R galo:galo /app
USER galo

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD node -e "require('http').get('http://127.0.0.1:3000/health', r => process.exit(r.statusCode===200?0:1)).on('error',()=>process.exit(1))"

CMD ["sh", "-c", "npx prisma migrate deploy && node dist/server.js"]
