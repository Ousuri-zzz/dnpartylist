/** @type {import('next').NextConfig} */
const path = require('path');

const nextConfig = {
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.alias['@'] = path.resolve(__dirname, './src');
      config.resolve.alias['undici'] = false; // รวมไว้ใน alias อย่างเดียวก็พอ
    }
    return config;
  },
  transpilePackages: ['framer-motion'],
};

module.exports = nextConfig;
