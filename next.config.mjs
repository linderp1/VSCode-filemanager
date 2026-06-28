/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  // The app reads files at request time; never statically optimize the routes.
  poweredByHeader: false,
};

export default nextConfig;
