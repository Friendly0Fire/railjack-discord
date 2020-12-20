FROM node:12-buster

WORKDIR /app

COPY ./dist .
COPY package*.json ./

RUN apk add --no-cache --virtual .gyp python make g++ \
    && npm install \
    && apk del .gyp

RUN mkdir /app/data
COPY config.json.template /app/data/
VOLUME /app/data

CMD [ "node", "main.js" ]