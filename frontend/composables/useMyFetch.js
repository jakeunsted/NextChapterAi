import { useAuth } from '~/composables/useAuth';
import { Preferences } from '@capacitor/preferences';

export const useMyFetch = async (path, options = {}, useAuthHeader = true) => {
  const config = useRuntimeConfig();
  const url = `${config.public.baseUrl}${path}`;
  const { logout, refreshAccessToken } = useAuth();

  const fetchWithToken = async (token) => {
    const headers = {
      'Content-Type': 'application/json',
      ...(useAuthHeader && token ? { 'Authorization': `Bearer ${token}` } : {}),
      ...options.headers,
    };

    let fetchOptions = {};
    fetchOptions = {
      method: options.method || 'GET',
      headers,
      ...(options.body && { body: JSON.stringify(options.body) }),
    };

    try {
      const response = await fetch(url, fetchOptions);

      if (response.status === 401) {
        if (process.client) {
          // Attempt to refresh the token
          const newToken = await refreshAccessToken();
          if (newToken) {
            return await fetchWithToken(newToken);
          } else {
            logout();
            return navigateTo('/login');
          }
        } else {
          // Handle SSR 401 error
          return null;
        }
      }

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error('Invalid content-type, expected application/json');
      }

      return response.json();
    } catch (error) {
      if (error.message === 'Failed to fetch') {
        throw new Error('Network error, please try again later');
      }
      throw error;
    }
  };

  try {
    let token = null;
    if (process.client) {
      const accessToken = await Preferences.get({ key: 'access_token' });
      token = accessToken.value;
    }
    return await fetchWithToken(token);
  } catch (error) {
    console.error('Fetch error:', error);
    throw error;
  }
};
