### Multi-stage Dockerfile for building and serving the Vite app
FROM node:20-alpine AS build
WORKDIR /app
ENV PATH /app/node_modules/.bin:$PATH
ARG VITE_DEFAULT_USERNAME
ARG VITE_DEFAULT_PASSWORD
ENV VITE_DEFAULT_USERNAME=$VITE_DEFAULT_USERNAME
ENV VITE_DEFAULT_PASSWORD=$VITE_DEFAULT_PASSWORD

# Install pnpm and system deps needed for native builds
RUN apk add --no-cache curl python3 make g++
RUN npm install -g pnpm@9.15.0

# Install dependencies based on lockfile first for caching
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# Copy source and build
COPY . .
RUN pnpm build

### Production image - nginx serving the built assets
FROM nginx:stable-alpine
COPY --from=build /app/dist /usr/share/nginx/html

# Use a simple SPA-friendly nginx config
RUN rm /etc/nginx/conf.d/default.conf
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
