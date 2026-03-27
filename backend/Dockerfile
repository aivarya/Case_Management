FROM node:18-slim
WORKDIR /app
RUN apt-get update -y && apt-get install -y openssl postgresql-client && rm -rf /var/lib/apt/lists/*
COPY package*.json ./
RUN npm install
COPY . .
RUN npx prisma generate
EXPOSE 3001
CMD ["sh", "-c", "until pg_isready -h db -p 5432; do echo 'Waiting for database...'; sleep 2; done && npx prisma migrate deploy && node seed.js; node server.js"]
