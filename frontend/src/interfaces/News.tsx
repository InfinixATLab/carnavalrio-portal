import type { Image } from "./Image";
import type { User } from "./User";

/** Modelo completo de uma notícia recebida do backend e exibida nas páginas do portal. */
export interface News {
    // Identidade, conteúdo editorial e vínculo opcional com uma escola de samba.
    id?: number;
    title: string;
    image: Image;
    body: string;
    school?: string;
    // Dados de autoria, endereço público, estado de publicação e datas de auditoria.
    author_name: string;
    author: User;
    link: string;
    slug: string;
    status: string;
    scheduleTo: Date | null;
    created_at: string;
    updated_at: string;
}
