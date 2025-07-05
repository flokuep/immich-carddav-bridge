FROM node:lts-alpine
RUN apk add --no-cache cronie 

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

RUN npm run build

COPY docker/entrypoint.sh /usr/local/bin/entrypoint.sh

RUN chmod +x /usr/local/bin/entrypoint.sh

CMD ["/usr/local/bin/entrypoint.sh"]