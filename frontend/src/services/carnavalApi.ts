// src/services/api.ts
import axios from "axios";
import { CARNAVAL_API_HOST } from "../constants/Host";

const api = axios.create({
    baseURL: `${CARNAVAL_API_HOST}api/`,
});

export default api;
