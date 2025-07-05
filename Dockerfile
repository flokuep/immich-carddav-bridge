FROM node:lts-alpine
RUN apk add --no-cache cronie 

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

RUN npm run build
RUN echo "$CRON_SCHEDULE /usr/local/bin/node /app/dist/index.js $COMMAND_PARAMS >> /var/log/cron.log 2>&1" > /etc/cron.d/immich-carddav-bridge \
    && chmod 0644 /etc/cron.d/immich-carddav-bridge \
    && touch /var/log/cron.log

CMD ["sh", "-c", "crond -f -L /var/log/cron.log & tail -f /var/log/cron.log"]