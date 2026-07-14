import { Navigate } from "react-router-dom";
import { jwtDecode } from "jwt-decode";
import { useState, useEffect } from "react";
import type { ReactNode } from "react";
import { ACCESS_TOKEN, REFRESH_TOKEN } from "../constants/Token";
import api from "./api";

interface ProtectedRouteProps {
    children: ReactNode;
}

// Guarda rotas que exigem sessão válida, renovando o access token expirado quando possível.
function ProtectedRoute({ children }: ProtectedRouteProps) {
    // `null` significa que a verificação inicial ainda está em andamento.
    const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);

    useEffect(() => {
        // Executa uma vez na montagem para decidir entre conteúdo protegido e redirecionamento.
        auth().catch(() => setIsAuthorized(false))
    }, []);

    const refreshToken = async () => {
        // Envia o refresh token salvo; uma resposta 200 deve trazer um novo token de acesso.
        const refreshToken = localStorage.getItem(REFRESH_TOKEN);

        try {
            const res = await api.post(`token/refresh/`, {
                refresh: refreshToken,
            });

            if (res.status === 200) {
                localStorage.setItem(ACCESS_TOKEN, res.data.acess)
                setIsAuthorized(true)
            } else {
                setIsAuthorized(false)
            }
        } catch (error) {
            setIsAuthorized(false);
        }
    }

    const auth = async () => {
        // Decodifica apenas a expiração do JWT e evita chamar refresh enquanto ele ainda é válido.
        const token = localStorage.getItem(ACCESS_TOKEN);

        if (!token) {
            setIsAuthorized(false);

            return
        }

        const decoded = jwtDecode(token)
        const tokenExpiration = decoded.exp
        const now = Date.now() / 1000

        if (tokenExpiration && tokenExpiration < now) {
            await refreshToken();
        } else {
            setIsAuthorized(true);
        }
    }

    if (isAuthorized === null) {
        return <div>Loading...</div>
    }

    return isAuthorized ? children : <Navigate to="/login" />
}

export default ProtectedRoute;
