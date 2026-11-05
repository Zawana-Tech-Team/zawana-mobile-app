export function mediaUrl(path: string) {
  const origin = (process.env.EXPO_PUBLIC_API_URL ?? '').replace(/\/api\/?$/, '').replace(/\/$/, '');
  return path.startsWith('/') ? `${origin}${path}` : path;
}
