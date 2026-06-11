/**
 * API request URL. When REACT_APP_API_URL is unset, returns a same-origin path
 * (e.g. /api/...) so CRA dev `package.json` "proxy" forwards to the backend.
 */
export function apiUrl(path) {
  const p = path.startsWith('/') ? path : `/${path}`;
  const base = (process.env.REACT_APP_API_URL || '').replace(/\/$/, '');
  return base ? `${base}${p}` : p;
}
