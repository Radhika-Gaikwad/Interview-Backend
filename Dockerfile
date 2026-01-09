# 1️⃣ Use Node.js base image
FROM node:20-alpine

# 2️⃣ Create app directory inside container
WORKDIR /app

# 3️⃣ Copy package files
COPY package*.json ./

# 4️⃣ Install dependencies
RUN npm install

# 5️⃣ Copy all backend code
COPY . .

# 6️⃣ Expose backend port
EXPOSE 5000

# 7️⃣ Start backend
CMD ["npm", "start"]
