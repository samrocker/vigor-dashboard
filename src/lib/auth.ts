import Cookies from 'js-cookie';

export const setTokens = (accessToken: string, refreshToken: string) => {
    Cookies.set('accessToken', accessToken, { expires: 1 });
    Cookies.set('refreshToken', refreshToken, { expires: 7 }); 
};

export const getAccessToken = () => Cookies.get('accessToken');
export const getRefreshToken = () => Cookies.get('refreshToken');

export const deleteTokens = () => {
    Cookies.remove('accessToken');
    Cookies.remove('refreshToken');
};

export const clearTokens = (): void => {
  if (typeof window !== 'undefined') {
    Cookies.remove('accessToken');
    Cookies.remove('refreshToken');
  }
};

export const isTokenExpired = (token: string): boolean => {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.exp * 1000 < Date.now();
  } catch {
    return true;
  }
};