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