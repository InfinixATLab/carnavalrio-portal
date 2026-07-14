import { useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { ACCESS_TOKEN, EMAIL, NAME, SURNAME, REFRESH_TOKEN } from "../constants/Token";

// Página sem interface que encerra a sessão local e devolve o visitante à tela de login.
function Logout() {
  const navigate = useNavigate();

  useEffect(() => {
    // Executa ao montar: remove tokens e dados pessoais persistidos antes do redirecionamento.
    localStorage.removeItem(ACCESS_TOKEN);
    localStorage.removeItem(REFRESH_TOKEN);
    localStorage.removeItem(EMAIL);
    localStorage.removeItem(NAME);
    localStorage.removeItem(SURNAME);

    navigate("/login");
  }, [navigate]);

  return null;
}

export default Logout;
