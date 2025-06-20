# Use an official Node.js base image with Debian (apt support)
FROM node:20-slim

# Set working directory
WORKDIR /app

# Install ffmpeg and clean up to reduce image size
RUN apt-get update && \
    apt-get install -y ffmpeg && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Copy package files first (leverage Docker cache)
COPY package*.json ./

# Install dependencies (omit devDependencies for production)
RUN npm install --production

# Copy the rest of your app
COPY . .

# Expose the port your app runs on
EXPOSE 3000

# Start the app
CMD ["node", "index.js"]
