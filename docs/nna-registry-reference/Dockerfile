# Use Node.js as the base image
FROM node:20

# Set working directory
WORKDIR /usr/src/app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy the rest of the application code
COPY . .

# Build the application
RUN npm run build

# Copy the entrypoint and pre-start scripts
COPY deployment/docker/entrypoint.sh .

# Make the scripts executable
RUN chmod +x entrypoint.sh

# List files for debugging
# RUN ls -R /app

# Expose the application port
EXPOSE 8080

# Start the application
ENTRYPOINT ["/usr/src/app/entrypoint.sh"]