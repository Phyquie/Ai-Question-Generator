# Step 1: Use Node base image
FROM node:18-alpine

# Step 2: Set working directory
WORKDIR /app

# Step 3: Copy package.json and install deps
COPY package*.json ./
RUN npm install

# Step 4: Copy all project files
COPY . .

# Step 5: Expose Vite default port
EXPOSE 5173

# Step 6: Run Vite dev server
CMD ["npm", "run", "dev", "--", "--host"]
