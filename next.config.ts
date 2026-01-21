import type { NextConfig } from "next";

const basePath = process.env.NEXT_PUBLIC_BASE_PATH;
const projectRoot = process.cwd();

const nextConfig: NextConfig = {
  output: "standalone",
  ...(basePath ? { basePath } : {}),
  trailingSlash: true,
  outputFileTracingRoot: projectRoot,
  turbopack: {
    root: projectRoot,
  },
};

export default nextConfig;
