FROM node:current-alpine

RUN apk add --no-cache python make g++

WORKDIR /usr/src/app

COPY package*.json ./
RUN npm install

COPY . .

CMD [ "node", "main.js" ]