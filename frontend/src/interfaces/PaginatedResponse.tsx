/** Estrutura genérica de paginação: total, links de navegação e itens da página atual. */
export interface PaginatedResponse<T> {
    count: number;
    next: string | null;
    previous: string | null;
    results: T[];
}
