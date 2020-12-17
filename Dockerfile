FROM node:12-buster

WORKDIR /app

COPY ./dist .

RUN mkdir /app/data
COPY config.json.template /app/data/
VOLUME /app/data

CMD [ "node", "index.js" ]