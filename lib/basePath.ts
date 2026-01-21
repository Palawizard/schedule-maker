const rawBasePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
const normalizedBasePath =
  rawBasePath !== "/" && rawBasePath.endsWith("/")
    ? rawBasePath.slice(0, -1)
    : rawBasePath;

export const basePath = normalizedBasePath;

export const withBasePath = (path: string) => {
  if (!basePath) return path;
  if (
    path.startsWith("http://") ||
    path.startsWith("https://") ||
    path.startsWith("data:") ||
    path.startsWith("blob:")
  ) {
    return path;
  }
  if (path === "/") return basePath;
  if (path === basePath || path.startsWith(`${basePath}/`)) return path;
  if (path.startsWith("/")) return `${basePath}${path}`;
  return `${basePath}/${path}`;
};

export const stripBasePath = (path: string) => {
  if (!basePath) return path;
  if (path === basePath) return "/";
  if (path.startsWith(`${basePath}/`)) return path.slice(basePath.length);
  return path;
};
