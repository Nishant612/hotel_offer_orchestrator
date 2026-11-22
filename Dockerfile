
FROM node:22-bookworm-slim

WORKDIR /app

# Install native runtime libraries needed by dependencies
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
       libatomic1 \
       ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Install Node.js dependencies
COPY package.json package-lock.json ./

RUN npm ci

# Copy application source
COPY tsconfig.json ./
COPY src ./src

ENV NODE_ENV=development

EXPOSE 3000

CMD ["npm", "run", "dev"]
