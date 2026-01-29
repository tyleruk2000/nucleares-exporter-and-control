FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy application files
COPY . .

# Expose port 3031
EXPOSE 3031

# Set default port
ENV PORT=3031

# Run the application
CMD ["npm", "start"]

