FROM node:18-alpine
# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy bot code
COPY . .

# Start bot
CMD ["node", "lib/bot.js"]


