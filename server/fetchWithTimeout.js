export function fetchWithTimeout(url, options = {}) {
  const { timeout = 8000, ...fetchOptions } = options;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  return fetch(url, { ...fetchOptions, signal: controller.signal })
    .finally(() => clearTimeout(timeoutId));
}
