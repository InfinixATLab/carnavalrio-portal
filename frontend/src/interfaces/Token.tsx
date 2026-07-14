/** Resposta de autenticação persistida localmente após um login bem-sucedido. */
export interface Token {
    // Tokens JWT mantêm a sessão; os demais campos personalizam a interface.
    access: string;
    refresh: string;
    email: string;
    name: string;
    surname: string;
}
