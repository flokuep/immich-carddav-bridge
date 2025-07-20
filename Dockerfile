FROM node:lts-alpine AS builder
WORKDIR /app

COPY . .

RUN npm install && npm run build


FROM node:lts-alpine AS runner
WORKDIR /app

RUN apk add --no-cache cronie

COPY --from=builder /app/dist /app/dist
COPY docker/entrypoint.sh /usr/local/bin/entrypoint.sh

RUN chmod +x /usr/local/bin/entrypoint.sh

CMD ["/usr/local/bin/entrypoint.sh"]
