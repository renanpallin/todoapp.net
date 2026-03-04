const BASE_URL = "/api/tags";

function getHeaders(): Record<string, string> {
  const headers: Record<string, string> = {};
  const token = localStorage.getItem("token");
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  return headers;
}

export const tagsApi = {
  getAll: async (): Promise<string[]> => {
    const response = await fetch(BASE_URL, { headers: getHeaders() });
    if (!response.ok) return [];
    return response.json();
  },
};
