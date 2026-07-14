// Cliente HTTP central da API Radar, incluindo autenticação, CSRF e renovação automática da sessão.
import axios, { type AxiosError, type InternalAxiosRequestConfig } from "axios";
import { ACCESS_TOKEN, EMAIL, NAME, REFRESH_TOKEN, SURNAME } from "../constants/Token";
import { API_HOST } from "../constants/Host";
import { getCookie } from "../tools/Tools";

// `withCredentials` permite que cookies, inclusive o CSRF, acompanhem requisições ao backend.
const api = axios.create({
    baseURL: `${API_HOST}radar/`,
    withCredentials: true,
});

api.defaults.xsrfCookieName = 'csrftoken';
api.defaults.xsrfHeaderName = 'X-CSRFToken';

// Antes de cada chamada, adiciona o JWT e, nas operações de escrita, o token CSRF disponível.
api.interceptors.request.use(
    (config: InternalAxiosRequestConfig) => {
        const token = localStorage.getItem(ACCESS_TOKEN);

        if (token && config.headers) {
            config.headers.Authorization = `Bearer ${token}`;
        }

        const csrfToken = getCookie('csrftoken');

        if (csrfToken && config.headers && config.method !== 'get') {
            config.headers['X-CSRFToken'] = csrfToken;
        }

        return config;
    },
    error => Promise.reject(error)
);

// Evita várias renovações simultâneas; requisições que falham durante o refresh aguardam na fila.
let isRefreshing = false;
type RetryableRequestConfig = InternalAxiosRequestConfig & { _retry?: boolean };

let failedQueue: Array<{
    resolve: (value?: unknown) => void;
    reject: (error: unknown) => void;
    config: InternalAxiosRequestConfig;
}> = [];

// Reexecuta a fila com o novo access token ou rejeita todas as promessas se a renovação falhar.
const processQueue = (error: unknown, token: string | null = null) => {
    failedQueue.forEach(prom => {
        if (error) prom.reject(error);
        else {
            if (token) prom.config.headers!["Authorization"] = `Bearer ${token}`;
            prom.resolve(api(prom.config));
        }
    });
    failedQueue = [];
};

// Ao receber 401, tenta uma única renovação e repete a requisição original autenticada.
api.interceptors.response.use(
    response => response,
    async (error: AxiosError) => {
        const originalRequest = error.config as RetryableRequestConfig | undefined;
        if (
            !originalRequest ||
            !error.response ||
            error.response.status !== 401 ||
            originalRequest._retry
        ) {
            return Promise.reject(error);
        }

        originalRequest._retry = true;

        if (isRefreshing) {
            return new Promise((resolve, reject) => {
                failedQueue.push({ resolve, reject, config: originalRequest });
            });
        }

        isRefreshing = true;

        try {
            const refreshToken = localStorage.getItem(REFRESH_TOKEN);
            if (!refreshToken) throw new Error("Refresh token ausente");

            // O endpoint espera `{ refresh }` e deve responder `{ access }` com um JWT novo.
            const res = await axios.post(`${API_HOST}radar/token/refresh/`, {
                refresh: refreshToken,
            });

            const newAccessToken = res.data.access;

            localStorage.setItem(ACCESS_TOKEN, newAccessToken);

            processQueue(null, newAccessToken);

            originalRequest.headers!["Authorization"] = `Bearer ${newAccessToken}`;
            return api(originalRequest);
        } catch (refreshErr) {
            // Uma renovação inválida encerra a sessão local e conduz o visitante ao login.
            processQueue(refreshErr, null);
            localStorage.removeItem(ACCESS_TOKEN);
            localStorage.removeItem(REFRESH_TOKEN);
            localStorage.removeItem(EMAIL);
            localStorage.removeItem(NAME);
            localStorage.removeItem(SURNAME);

            if (! (window.location.pathname in ["/login", "/register"])) {
                window.location.href = "/login";
            }

            return Promise.reject(refreshErr);
        } finally {
            isRefreshing = false;
        }
    }
);

export default api;
