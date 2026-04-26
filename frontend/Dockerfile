FROM node:22 AS builder
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
ARG NEXT_PUBLIC_API_URL=http://backend:8080/api
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
RUN npm run build

FROM node:22
WORKDIR /app
RUN npm install -g http-server
COPY --from=builder /app/dist ./dist
EXPOSE 80
CMD ["http-server", "dist", "-p", "80", "-a", "0.0.0.0", "-c-1"]
