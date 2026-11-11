# ---------- Etape 1 : compiler le frontend ----------
FROM node:22-slim AS front
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ .
RUN npm run build

# ---------- Etape 2 : image finale (backend + frontend compile) ----------
FROM node:22-slim
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

WORKDIR /app/backend
COPY backend/package*.json ./
RUN npm ci
COPY backend/ .
# ... (lignes précédentes inchangées)

RUN npm ci
COPY backend/ .

# AJOUT : valeur factice pour le build uniquement
ENV DATABASE_URL="postgresql://dummy:dummy@localhost:5432/dummy"

RUN npx prisma generate

COPY --from=front /app/frontend/dist /app/frontend/dist

ENV NODE_ENV=production
EXPOSE 4000

CMD ["sh", "-c", "npx prisma migrate deploy && node src/server.js"]
