# ---------- Étape 1 : compiler le frontend ----------
FROM node:22-slim AS front
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ .
RUN npm run build

# ---------- Étape 2 : image finale ----------
FROM node:22-slim
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

WORKDIR /app/backend
COPY backend/package*.json ./
RUN npm ci
COPY backend/ .

# prisma generate ne se connecte pas à la base : une URL factice suffit.
RUN DATABASE_URL="postgresql://build:build@localhost:5432/build" npx prisma generate

COPY --from=front /app/frontend/dist /app/frontend/dist

ENV NODE_ENV=production
EXPOSE 4000

CMD ["sh", "-c", "npx prisma migrate deploy && exec node src/server.js"]