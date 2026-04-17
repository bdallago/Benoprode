import withPWAInit from "@ducanh2912/next-pwa";

const withPWA = withPWAInit({
  dest: "public",
  disable: true, // Always disable in AI Studio dev environment to prevent 404 caching
  register: true,
  skipWaiting: true,
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  allowedDevOrigins: [
    'ais-dev-dgdf73jgqaovaxgrfegmzm-180988684270.us-west1.run.app',
    'ais-pre-dgdf73jgqaovaxgrfegmzm-180988684270.us-west1.run.app',
    'localhost:3000'
  ],
  async rewrites() {
    return [
      {
        source: '/__/auth/:path*',
        destination: 'https://gen-lang-client-0176693528.firebaseapp.com/__/auth/:path*',
      },
    ];
  },
};

export default withPWA(nextConfig);
