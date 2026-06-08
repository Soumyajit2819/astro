const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

function getHeaders() {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Supabase environment variables are missing.");
  }

  return {
    apikey: supabaseAnonKey,
    Authorization: `Bearer ${supabaseAnonKey}`,
    "Content-Type": "application/json",
    Prefer: "return=representation"
  };
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || "Supabase request failed.");
  }

  return (await response.json()) as T;
}

export async function selectRows<T>(table: string) {
  const response = await fetch(`${supabaseUrl}/rest/v1/${table}?select=*`, {
    headers: getHeaders(),
    cache: "no-store"
  });
  return handleResponse<T[]>(response);
}

export async function deleteAllRows(table: string, filterColumn: string) {
  const response = await fetch(`${supabaseUrl}/rest/v1/${table}?${filterColumn}=not.is.null`, {
    method: "DELETE",
    headers: getHeaders()
  });

  if (!response.ok && response.status !== 404) {
    const text = await response.text();
    throw new Error(text || `Failed to clear ${table}.`);
  }
}

export async function insertRows<T>(table: string, rows: T[]) {
  if (rows.length === 0) {
    return [];
  }

  const response = await fetch(`${supabaseUrl}/rest/v1/${table}`, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify(rows)
  });
  return handleResponse<T[]>(response);
}

export async function updateRow<T>(table: string, filterColumn: string, filterValue: string | number, updates: Partial<T>) {
  const response = await fetch(`${supabaseUrl}/rest/v1/${table}?${filterColumn}=eq.${encodeURIComponent(String(filterValue))}`, {
    method: "PATCH",
    headers: getHeaders(),
    body: JSON.stringify(updates)
  });

  return handleResponse<T[]>(response);
}

export async function deleteRowsWhere(table: string, filterColumn: string, filterValue: string | number) {
  const response = await fetch(
    `${supabaseUrl}/rest/v1/${table}?${filterColumn}=eq.${encodeURIComponent(String(filterValue))}`,
    { method: "DELETE", headers: getHeaders() }
  );

  if (!response.ok && response.status !== 404) {
    const text = await response.text();
    throw new Error(text || `Failed to delete from ${table}.`);
  }
}

export async function uploadPublicFile(bucket: string, path: string, file: File) {
  const normalizedBucket = bucket.trim();
  const normalizedPath = path.trim();

  const response = await fetch(`${supabaseUrl}/storage/v1/object/${normalizedBucket}/${normalizedPath}`, {
    method: "POST",
    headers: {
      apikey: supabaseAnonKey || "",
      Authorization: `Bearer ${supabaseAnonKey || ""}`,
      "x-upsert": "true"
    },
    body: file
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || "File upload failed.");
  }

  return `${supabaseUrl}/storage/v1/object/public/${normalizedBucket}/${normalizedPath}`;
}
