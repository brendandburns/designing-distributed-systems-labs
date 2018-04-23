FROM node:carbon

# Create a /tmp/ffmpeg folder where we will put the output of FFMPEG
RUN mkdir -p /tmp/ffmpeg

# Create app directory
WORKDIR /tmp/ffmpeg

# Install app dependencies
# A wildcard is used to ensure both package.json AND package-lock.json are copied
# where available (npm@5+)
COPY package*.json ./

RUN npm install
# If you are building your code for production
# RUN npm install --only=production

# Bundle app source
COPY . .

# Expose this container for the /alive and /ready endpoints
EXPOSE 8081
CMD [ "npm", "start" ]
