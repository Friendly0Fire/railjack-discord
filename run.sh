#!/bin/bash

docker stop yawdb && docker rm yawdb

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"

docker run -d -v $DIR/data:/usr/src/app/data --name yawdb friendly0fire/yawdb

docker inspect -f '{{ .Mounts }}' yawdb