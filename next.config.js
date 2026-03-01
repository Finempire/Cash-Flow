/** @type {import('next').NextConfig} */
const nextConfig = {
    experimental: {
        serverComponentsExternalPackages: ['bcryptjs', 'bcrypt', 'next-auth', '@auth/core'],
        instrumentationHook: false,
    },
    images: {
        domains: ['localhost', 'cashflow-documents.r2.cloudflarestorage.com'],
    },
    env: {
        NEXT_TELEMETRY_DISABLED: '1',
    },
    // The issue seems to be the SWC minifier mangling NextAuth/OpenTelemetry internals
    // We already tried swcMinify: false and it broke with Terser. 
    // Trying transpilePackages as a workaround for the opentelemetry bug
    transpilePackages: ['@opentelemetry/api'],
};

module.exports = nextConfig;
