/** @type {import('next').NextConfig} */
const nextConfig = {
    serverComponentsExternalPackages: ['bcryptjs'],
    experimental: {
        serverActions: {
            bodySizeLimit: '10mb',
        },
    },
    images: {
        remotePatterns: [
            {
                protocol: 'https',
                hostname: '**.amazonaws.com',
            },
            {
                protocol: 'https',
                hostname: '**.r2.cloudflarestorage.com',
            },
        ],
    },
};

module.exports = nextConfig;
