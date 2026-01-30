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
    const res = await api.get("users/me/", { headers: header() });
    return res.data;
}

export default function RoleProtectedRoute({ children, allowedRoles }: Props) {
  const [user, setUser] = useState<User>();

    useEffect(() => {
        const getUser = async () => {
            try {
                setUser(await fetchUser());
            } catch (error) {
                <Navigate to="/login" replace />;
            }
        }

        getUser();
    }, []);

  if (!user) {
    return <Spinner />
  }

  const hasAccess = allowedRoles.some((role) => user[role]);

  if (!hasAccess) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
