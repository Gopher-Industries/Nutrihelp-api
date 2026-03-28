// Shared base API utilities used by service classes
const API_BASE_URL = 'https://localhost:443/api';

export class BaseApi {
    constructor(baseURL = API_BASE_URL) {
        this.baseURL = baseURL;
    }

    getCurrentUserId() {
        const storageKeys = [
            { storage: localStorage, key: 'user' },
            { storage: localStorage, key: 'user_session' },
            { storage: sessionStorage, key: 'user_session' }
        ];

        for (const { storage, key } of storageKeys) {
            const data = storage.getItem(key);
            if (data) {
                try {
                    const userData = JSON.parse(data);
                    const userId = userData.user_id || userData.id || userData.uid || userData.sub;
                    if (userId) return userId;
                } catch (error) {
                    console.error(`Error parsing ${key}:`, error);
                }
            }
        }
        return null;
    }

    getAuthToken() {
        const authToken = localStorage.getItem('auth_token');
        if (authToken) return authToken;

        const storageKeys = [
            { storage: localStorage, key: 'user' },
            { storage: localStorage, key: 'user_session' },
            { storage: sessionStorage, key: 'user_session' }
        ];

        for (const { storage, key } of storageKeys) {
            const data = storage.getItem(key);
            if (data) {
                try {
                    const userData = JSON.parse(data);
                    if (userData.token) return userData.token;
                } catch (error) {
                    console.error(`Error parsing ${key}:`, error);
                }
            }
        }
        return null;
    }

    getHeaders() {
        const token = this.getAuthToken();
        return {
            'Content-Type': 'application/json',
            ...(token && { 'Authorization': `Bearer ${token}` })
        };
    }
}

export default BaseApi;
