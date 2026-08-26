const API_BASE_URL = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_URL) || 'http://localhost:4000/api';

const getHeaders = () => {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

const handleResponse = async (response: Response) => {
  const text = await response.text();
  let json: any;
  try {
    json = text ? JSON.parse(text) : {};
  } catch {
    throw new Error('Invalid JSON response from server');
  }

  if (!response.ok) {
    // Auto-logout on 401 or ACCOUNT_SUSPENDED: clear stale token and redirect to login
    const isSuspended =
      response.status === 403 &&
      (json.code === 'ACCOUNT_SUSPENDED' ||
        (typeof json.error === 'string' && json.error.toLowerCase().includes('suspended')));

    if (response.status === 401 || isSuspended) {
      localStorage.removeItem('token');
      localStorage.removeItem('userRole');
      localStorage.removeItem('userName');
      localStorage.removeItem('teacherId');
      localStorage.removeItem('teacherStatus');
      localStorage.removeItem('selectedProgram');

      if (isSuspended) {
        sessionStorage.setItem(
          'suspensionNotice',
          json.error || 'Your account has been suspended. Please contact the ICT Office or system administrator.'
        );
      }

      // Only redirect if not already on the login page
      if (!window.location.pathname.includes('/login')) {
        window.location.href = isSuspended ? '/login?suspended=1' : '/login';
      }
    }

    // Backend sends errors as { error: "message", code: "CODE" } or { error: { message: "..." } } or { message: "..." }
    let errorMsg = response.statusText;
    if (typeof json.error === 'string') {
      errorMsg = json.error;
    } else if (typeof json.error === 'object' && json.error?.message) {
      errorMsg = json.error.message;
    } else if (typeof json.message === 'string') {
      errorMsg = json.message;
    }
    const err: any = new Error(errorMsg);
    err.status = response.status;
    err.code = json.code;
    err.response = { status: response.status, data: json };
    throw err;
  }

  // Normalize: the frontend expects { data: { success: boolean, data: ... } }
  // Backend returns various shapes: { data: [...] }, { token, user }, { message }, etc.
  if (json.success !== undefined) {
    return { data: json };
  }
  if (json.data !== undefined) {
    return { data: { success: true, data: json.data } };
  }
  // For login responses like { token, user }
  return { data: { success: true, ...json } };
};

export const api = {
  async get(url: string) {
    const response = await fetch(`${API_BASE_URL}${url}`, {
      method: 'GET',
      headers: getHeaders(),
    });
    return handleResponse(response);
  },

  async post(url: string, body?: any) {
    const response = await fetch(`${API_BASE_URL}${url}`, {
      method: 'POST',
      headers: getHeaders(),
      body: body ? JSON.stringify(body) : undefined,
    });
    return handleResponse(response);
  },

  async put(url: string, body?: any) {
    const response = await fetch(`${API_BASE_URL}${url}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: body ? JSON.stringify(body) : undefined,
    });
    return handleResponse(response);
  },

  async delete(url: string) {
    const response = await fetch(`${API_BASE_URL}${url}`, {
      method: 'DELETE',
      headers: getHeaders(),
    });
    return handleResponse(response);
  },
};
