FROM node:current-alpine

WORKDIR /app

COPY ./package*.json ./

RUN apk add --no-cache --virtual .gyp python make g++ \
    && npm install \
    && apk del .gyp

COPY ./build .

RUN mkdir /app/data
COPY data/config.json.template /app/data/
VOLUME /app/data

CMD [ "node", "main.js" ]