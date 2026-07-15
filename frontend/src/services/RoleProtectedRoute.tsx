import { Navigate } from "react-router-dom";
import Spinner from "../components/Spinner/Spinner";
import type { User } from "../interfaces/User";
import api from "./api";
import { ACCESS_TOKEN } from "../constants/Token";
import { useState, useEffect } from "react";

interface Props {
  children: React.ReactNode;
  allowedRoles: ("is_editor" | "is_columnist" | "is_proofreader")[];
}

const header = () => ({
    "Content-Type": "application/json",
    'Authorization': `Bearer ${localStorage.getItem(ACCESS_TOKEN)}`
})

async function fetchUser(): Promise<User> {
    // O endpoint deve responder um perfil com os indicadores booleanos de função.
    const res = await api.get("users/me/", { headers: header() });
    return res.data;
}

export default function RoleProtectedRoute({ children, allowedRoles }: Props) {
  // O perfil indefinido mantém o spinner até a autorização poder ser calculada.
  const [user, setUser] = useState<User>();
  const [shouldRedirect, setShouldRedirect] = useState(false);

    useEffect(() => {
        // Consulta o usuário uma vez ao montar a proteção da área administrativa.
        const getUser = async () => {
            try {
                setUser(await fetchUser());
            } catch {
                setShouldRedirect(true);
            }
        }

        getUser();
    }, []);

  if (shouldRedirect) {
    return <Navigate to="/login" replace />;
  }

  if (!user) {
    return <Spinner />
  }

  // Basta que uma das funções permitidas esteja ativa no perfil retornado.
  const hasAccess = allowedRoles.some((role) => user[role]);

  if (!hasAccess) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
