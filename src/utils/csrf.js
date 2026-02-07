export function getCsrfToken() {
  const match = document.cookie.match(/(?:^|;\s*)csrf-token=([^;]*)/);
  return match ? decodeURIComponent(match[1]) : null;
}

export function csrfHeaders() {
  const token = getCsrfToken();
  return token ? { 'X-CSRF-Token': token } : {};
}
