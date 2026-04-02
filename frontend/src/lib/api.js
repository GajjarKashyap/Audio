const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || "http://localhost:3001";

async function request(path, apiKey) {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    headers: {
      "x-api-key": apiKey
    }
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.error || "Request failed");
  }

  return response.json();
}

export function getPlugins(apiKey) {
  return request("/plugins", apiKey);
}

export function searchSongs(query, apiKey) {
  const params = new URLSearchParams({ q: query });
  return request(`/search?${params.toString()}`, apiKey);
}

export function getStreamUrl(id, source, apiKey) {
  const params = new URLSearchParams({ id, source });
  return request(`/stream?${params.toString()}`, apiKey);
}

export function getRecommendations(artist, track, apiKey) {
  const params = new URLSearchParams({ artist, track });
  return request(`/recommend?${params.toString()}`, apiKey);
}

export function getLyrics(artist, track, duration, apiKey) {
  const params = new URLSearchParams({ artist, track, duration });
  return request(`/lyrics?${params.toString()}`, apiKey);
}

// NEW: Direct play URL — resolves and pipes audio in one request (no 403)
export function buildPlayUrl(id, source, apiKey) {
  const params = new URLSearchParams({ id, source, api_key: apiKey });
  return `${apiBaseUrl}/play?${params.toString()}`;
}

// Legacy proxy (kept for SoundCloud compatibility)
export function buildProxyUrl(streamUrl, apiKey) {
  const params = new URLSearchParams({ url: streamUrl, api_key: apiKey });
  return `${apiBaseUrl}/proxy?${params.toString()}`;
}
