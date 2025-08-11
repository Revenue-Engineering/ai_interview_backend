# Use official Node.js LTS image
FROM node:22-alpine

# Set working directory
WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install 

# Copy rest of the application
COPY . .

# Expose application port
EXPOSE 3000

# Start the application
CMD ["npm", "run", "dev"]
