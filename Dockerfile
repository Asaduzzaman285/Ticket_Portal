# Use Node.js Alpine image
FROM node:22.17.1-alpine

# Set working directory
WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy app source
COPY . .

# Expose container port
EXPOSE 3000

# Start React app using start:local script
CMD ["npm", "run", "start:local"]


