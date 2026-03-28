# Use the official Bun image
FROM oven/bun:1

# Set the working directory inside the container
WORKDIR /app

# Copy package files first (to cache dependencies)
COPY package.json bun.lock ./

# Install dependencies (production mode)
# ADDED --ignore-scripts to stop it from trying to run "husky"
RUN bun install --frozen-lockfile --production --ignore-scripts

# Copy the rest of your source code
COPY . .

# Expose the port defined in the README (3030)
EXPOSE 3030

# Start the server
CMD ["bun", "run", "start"]