// Recupera a URL da API definida na variável de ambiente do Vite   
const apiHost = import.meta.env.VITE_API_HOST as string;
// Garante que a URL da API sempre termine com "/"
export const API_HOST = apiHost.endsWith("/") ? apiHost : `${apiHost}/`;

// Recupera a URL da aplicação definida na variável de ambiente do Vite
export const HOST = import.meta.env.VITE_HOST as string;
// Recupera a URL base da API do Carnaval definida na variável de ambiente do Vite
export const CARNAVAL_API_HOST = import.meta.env.VITE_CARNAVAL_API_HOST as string;
