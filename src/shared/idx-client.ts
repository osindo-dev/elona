const IDX_BASE_URL = "https://www.idx.co.id";

const BROWSER_USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";

export interface IdxFetchOptions {
  headers?: Record<string, string>;
}

export async function fetchIdx(path: string, options: IdxFetchOptions = {}): Promise<Response> {
  const url = path.startsWith("http") ? path : `${IDX_BASE_URL}${path}`;
  return fetch(url, {
    headers: {
      "User-Agent": BROWSER_USER_AGENT,
      Accept: "application/json, text/plain, */*",
      Referer: "https://www.idx.co.id/",
      ...options.headers,
    },
  });
}
