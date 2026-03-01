const nextConfig = {
    swcMinify: false,
    env: {
        NEXT_TELEMETRY_DISABLED: "1",
    },
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
