#!/bin/bash

docker build -t yet-another-wf-discord-bot .
docker run -it --rm --name yawdb yet-another-wf-discord-bot