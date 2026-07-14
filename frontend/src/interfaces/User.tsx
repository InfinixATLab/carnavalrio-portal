/** Perfil autenticado e sinalizadores usados nas decisões de autorização da interface. */
export interface User {
    name: string,
    surname: string,
    email: string,
    // Cada indicador representa uma função reconhecida pelas rotas administrativas.
    is_staff: boolean,
    is_editor: boolean,
    is_columnist: boolean,
    is_proofreader: boolean,
}
