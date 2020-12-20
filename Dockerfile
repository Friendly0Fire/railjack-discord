FROM node:12-buster

WORKDIR /app

COPY ./dist .
COPY package*.json ./
COPY node_modules ./node_modules

RUN mkdir /app/data
COPY config.json.template /app/data/
VOLUME /app/data

CMD [ "node", "index.js" ]