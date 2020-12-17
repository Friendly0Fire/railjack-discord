FROM node:current-alpine

WORKDIR /app

COPY ./dist .

RUN mkdir /app/data
COPY data/config.json.template /app/data/
VOLUME /app/data

CMD [ "node", "index.js" ]