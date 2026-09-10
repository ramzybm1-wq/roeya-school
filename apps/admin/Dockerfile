FROM node:20-alpine

WORKDIR /app

RUN npm install -g tsx typescript

COPY package.json tsconfig.base.json ./
COPY packages/ packages/
COPY storage/ storage/
COPY apps/admin/ apps/admin/

RUN npm install

ENV NODE_ENV=production
ENV PORT=3001

EXPOSE 3001

WORKDIR /app/apps/admin
CMD ["npm", "start"]
