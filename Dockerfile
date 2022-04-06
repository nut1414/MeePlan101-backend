FROM node:lts-alpine

WORKDIR /app
ENV NODE_ENV=production

COPY package.json package-lock.json ./

RUN npm install
COPY . .

EXPOSE 8080

CMD ["node", "app.js"]