// Cliente HTTP dedicado aos dados públicos de escolas, separado da API autenticada do portal.
import axios from "axios";
import { CARNAVAL_API_HOST } from "../constants/Host";

// Todas as chamadas feitas por este cliente partem do prefixo /api/ do serviço Carnaval.
const api = axios.create({
    baseURL: `${CARNAVAL_API_HOST}api/`,
});

export default api;
