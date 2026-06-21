import AsyncStorage from "@react-native-async-storage/async-storage";

// ponytail: set EXPO_PUBLIC_API_URL in .env (your PC's LAN IP, e.g. http://192.168.1.5:5001).
// Falls back to localhost for web/simulator. Swap for the AWS Elastic IP at deploy time.
const BASE = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:5001";

const TOKEN_KEY = "token";

export const tokenStore = {
  get: () => AsyncStorage.getItem(TOKEN_KEY),
  set: (t: string) => AsyncStorage.setItem(TOKEN_KEY, t),
  clear: () => AsyncStorage.removeItem(TOKEN_KEY),
};

export async function api<T = any>(
  path: string,
  opts: { method?: string; body?: unknown; auth?: boolean } = {}
): Promise<T> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (opts.auth !== false) {
    const t = await tokenStore.get();
    if (t) headers.Authorization = `Bearer ${t}`;
  }
  const res = await fetch(`${BASE}${path}`, {
    method: opts.method ?? (opts.body ? "POST" : "GET"),
    headers,
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
  const data = res.headers.get("content-type")?.includes("json")
    ? await res.json()
    : await res.text();
  if (!res.ok) throw new Error((data as any)?.error || (data as any)?.message || `HTTP ${res.status}`);
  return data as T;
}

// Streaming POST. Server sends a metadata JSON line, then raw text as it
// generates. RN's fetch can't stream, so we use XHR's incremental responseText.
export async function streamPost(
  path: string,
  body: unknown,
  cb: { onMeta?: (meta: any) => void; onChunk: (textSoFar: string) => void }
): Promise<void> {
  const token = await tokenStore.get();
  await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", `${BASE}${path}`);
    xhr.setRequestHeader("Content-Type", "application/json");
    if (token) xhr.setRequestHeader("Authorization", `Bearer ${token}`);
    let metaDone = false;
    xhr.onprogress = () => {
      const raw = xhr.responseText;
      const nl = raw.indexOf("\n");
      if (nl === -1) return;
      if (!metaDone) {
        try {
          cb.onMeta?.(JSON.parse(raw.slice(0, nl)));
        } catch {}
        metaDone = true;
      }
      cb.onChunk(raw.slice(nl + 1));
    };
    xhr.onload = () =>
      xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error(`HTTP ${xhr.status}`));
    xhr.onerror = () => reject(new Error("Network error"));
    xhr.send(JSON.stringify(body));
  });
}
