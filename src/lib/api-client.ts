export class ApiError extends Error {
  constructor(
    public code: string,
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

/** POST JSON and return the body, or throw the server's own error message. */
export async function post<T = Record<string, unknown>>(path: string, body: unknown = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetch(path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  } catch {
    throw new ApiError("network", "Couldn't reach QUORUM. Check your connection and try again.", 0);
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const e = (data as { error?: { code?: string; message?: string } }).error;
    throw new ApiError(e?.code ?? "error", e?.message ?? "Something went wrong. Try again.", res.status);
  }
  return data as T;
}
