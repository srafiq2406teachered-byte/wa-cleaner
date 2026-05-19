const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['whatsapp-web.js', 'puppeteer'],
  },
  webpack: function(config, options) {
    if (!options.isServer) {
      config.resolve.fallback = { fs: false, net: false, tls: false };
    }
    return config;
  },
};

module.exports = nextConfig;
