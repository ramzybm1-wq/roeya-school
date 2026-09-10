FROM node:20-alpine

WORKDIR /app

RUN npm install -g tsx typescript

COPY package.json tsconfig.base.json ./
COPY packages/ packages/
COPY storage/ storage/
COPY apps/client/ apps/client/

RUN npm install

ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

WORKDIR /app/apps/client
CMD ["npm", "start"]
