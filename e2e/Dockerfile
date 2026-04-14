FROM mcr.microsoft.com/playwright:v1.59.1-jammy
WORKDIR /e2e
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
CMD ["npx", "playwright", "test", "--reporter=list"]
