#!/bin/bash

docker stop yawdb && docker rm yawdb

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"

docker build -t yet-another-wf-discord-bot .
docker run -d -v $DIR/data:/usr/src/app/data --name yawdb yet-another-wf-discord-bot

docker inspect -f '{{ .Mounts }}' yawdb