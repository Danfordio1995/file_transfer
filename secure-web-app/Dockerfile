FROM node:16-alpine

# Create app directory
WORKDIR /usr/src/app

# Install app dependencies
COPY package*.json ./
RUN npm ci --only=production

# Bundle app source
COPY . .

# Create a non-root user to run the app
RUN addgroup -g 1001 -S appuser && \
    adduser -u 1001 -S appuser -G appuser
USER appuser

EXPOSE 3000
CMD [ "node", "src/index.js" ]
