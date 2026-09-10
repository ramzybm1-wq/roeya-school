FROM node:20-alpine

WORKDIR /app

# Install tsx for direct TypeScript execution
RUN npm install -g tsx typescript

COPY package.json tsconfig.base.json ./
COPY packages/ packages/
COPY storage/ storage/
COPY apps/api/ apps/api/

RUN npm install

RUN mkdir -p /app/storage/private-documents /app/storage/media

ENV NODE_ENV=production
ENV PORT=4000

EXPOSE 4000

CMD ["npx", "tsx", "apps/api/src/index.ts"]
