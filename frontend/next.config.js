/** @type {import('next').NextConfig} */
let rawApiUrl =
  process.env.API_URL ||
  process.env.BACKEND_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  "https://mind-ai-gv1f.onrender.com";

rawApiUrl = rawApiUrl.trim().replace(/^['"]+|['"]+$/g, "");

if (process.env.NODE_ENV === "production" && rawApiUrl.includes("localhost")) {
  rawApiUrl = "https://mind-ai-gv1f.onrender.com";
}

if (!rawApiUrl.startsWith("http://") && !rawApiUrl.startsWith("https://")) {
  rawApiUrl = `https://${rawApiUrl}`;
}

const apiUrl = rawApiUrl.replace(/\/+$/, "");

const nextConfig = {
  reactStrictMode: true,
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${apiUrl}/api/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;
