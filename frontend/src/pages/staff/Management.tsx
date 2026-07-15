import { useNavigate } from "react-router-dom";
import type { News } from "../../interfaces/News";
import type { PaginatedResponse } from "../../interfaces/PaginatedResponse";
import api from "../../services/api";
import { useEffect, useMemo, useState } from "react";
import { FaEdit, FaTrashAlt } from "react-icons/fa";
import { formatarDataHora } from "../../tools/Tools";

type ModalProps = {
    message: string;
    onConfirm?: () => void;
    onCancel?: () => void;
};

// Lista as notícias administrativas; durante a busca, percorre todas as páginas disponíveis.
async function fetchNews(loadAllPages = false, signal?: AbortSignal): Promise<News[]> {
    try {
        const collectedNews: News[] = [];
        const visitedPages = new Set<string>();
        let nextPage: string | null = "news/";

        while (nextPage && !visitedPages.has(nextPage)) {
            const currentPage = nextPage;
            visitedPages.add(currentPage);
            const {data} = await api.get<PaginatedResponse<News>>(currentPage, { signal });
            collectedNews.push(...data.results);
            nextPage = loadAllPages ? data.next : null;
        }

        return collectedNews;
    } catch (error: any) {
        if (signal?.aborted) throw error;
        console.error("Erro ao buscar notícias: ", error)

        if (error.code === "ECONNABORTED") {
            throw new Error("Problemas de conexão. Tente novamente mais tarde.")
        } else if (error.response) {
            throw new Error(`Erro ${error.response.status}: ${error.response.statusText}`);
        } else {
            throw new Error("Erro inesperado ao carregar as notícias.");
        }
    }
}
// permite fazer pesquisa sennivel
const normalizeSearchValue = (value: string | null | undefined) =>
    value
        ?.normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLocaleLowerCase("pt-BR") ?? "";

// Remove uma notícia pelo slug e converte sucesso ou falha em um resultado simples para a tela.
async function deleteArticle(slug: string): Promise<{ error: any } | { response: string}> {
    try {
        await api.delete(`news/${slug}/`)
    
        return { response: "Artigo deletado com sucesso." };
    } catch (err: any) {
        return { error: err };
    }
}


export default function Management() {
    // Estados mantêm a busca digitada, a listagem atual e o slug aguardando confirmação de exclusão.
    const [searchTerm, setSearchTerm] = useState<string>("");
    const [debouncedSearchTerm, setDebouncedSearchTerm] = useState<string>("");
    const [news, setNews] = useState<News[]>([]);
    const [articleToDelete, setArticleToDelete] = useState<string | null>(null);
    const navigate = useNavigate();
    // Caixa de confirmação local usada antes de uma exclusão permanente.
    const Modal = ({ message, onConfirm, onCancel }: ModalProps) => (
        <div className="px-2 fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl shadow-lg p-6 max-w-sm w-full">
                <h2 className="text-lg font-bold text-red-600 mb-2">Deseja continuar?</h2>
                <p className="text-sm text-gray-800">{message}</p>
                {onConfirm && (
                    <div className="mt-4 flex justify-center">
                        <button
                            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                            onClick={onConfirm}
                        >
                            Deletar Matéria
                        </button>
                    </div>
                )}
                <div className="mt-4 flex justify-center">
                    <button
                        className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                        onClick={onCancel}
                    >
                        Fechar
                    </button>
                </div>
            </div>
        </div>
    );
    
    useEffect(() => {
        const timer = window.setTimeout(() => {
            setDebouncedSearchTerm(searchTerm.trim());
        }, 300);

        return () => window.clearTimeout(timer);
    }, [searchTerm]);

    useEffect(() => {
        // Sem busca, preserva o carregamento normal; com busca, considera todas as páginas.
        const controller = new AbortController();

        void (async () => {
            try {
                const loadedNews = await fetchNews(Boolean(debouncedSearchTerm), controller.signal);
                setNews(loadedNews);
            } catch (error) {
                if (controller.signal.aborted) return;
                setNews([]);
            }
        })();

        return () => controller.abort();
    }, [debouncedSearchTerm]);

    const visibleNews = useMemo(() => {
        const normalizedTerm = normalizeSearchValue(debouncedSearchTerm);
        if (!normalizedTerm) return news;

        return news.filter((article) =>
            [article.title, article.author_name, article.status, article.image?.alt]
                .some((value) => normalizeSearchValue(value).includes(normalizedTerm))
        );
    }, [debouncedSearchTerm, news]);

    const remove = async (slug: string) => {
        // Após a API responder, retira o item localmente para evitar uma segunda consulta completa.
        try {
            await deleteArticle(slug);
            setNews(prev => prev?.filter(article => article.slug !== slug));
        } catch (error: any) {
            console.error(error);
        } finally {
            setArticleToDelete(null);
        }
    }
    
    return(
        <div className="min-h-screen bg-gray-50 py-8 sm:py-10">
            {articleToDelete && (
                /* O modal bloqueia a exclusão até o usuário confirmar ou cancelar. */
                <Modal 
                    message="Ao continuar, esta matéria será deletada."
                    onConfirm={() => remove(articleToDelete)}
                    onCancel={() => setArticleToDelete("")}
                />
            )}
            <header className="px-4 text-center">
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#6e3a62ff]">
                    Área editorial
                </p>
                <h1 className="mt-2 text-2xl font-bold text-gray-950 sm:text-3xl">
                    Gerenciamento de Notícias
                </h1>
                <p className="mx-auto mt-2 max-w-2xl text-sm leading-6 text-gray-500">
                    Encontre uma matéria para editar ou publique um novo conteúdo.
                </p>
            </header>
            <main className="mx-auto my-8 flex max-w-7xl flex-col gap-6 px-4 sm:px-6 lg:px-8">
                <div className="flex flex-col items-stretch gap-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm md:flex-row md:items-center">
                    {/* Add News Button */}
                    <button
                        onClick={() => navigate("publish/")}
                        className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-5 py-3 font-semibold text-white shadow-sm transition-all duration-200 hover:bg-blue-700 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 md:w-auto"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        <span className="no-wrap">Nova Matéria</span>
                    </button>
                    {/* Search */}
                    <div className="relative w-full md:flex-1">
                        <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                                />
                            </svg>
                        </div>
                        <input
                            type="text"
                            placeholder="Buscar sua notícia..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full rounded-lg border border-gray-300 py-3 pl-10 pr-4 text-sm text-gray-900 transition-colors placeholder:text-gray-400 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                </div>
                {/* Grade de notícias com atalhos de edição e exclusão em cada item. */}
                <div className="grid max-w-full grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
                    {Array.isArray(visibleNews) && visibleNews.map((article) => (
                        <article
                            key={article.slug}
                            className="group flex min-w-0 flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-gray-300 hover:shadow-lg"
                        >
                            <div className="relative aspect-[16/9] w-full overflow-hidden bg-gray-100">
                                {article.image && (
                                    <img
                                        src={article.image.file}
                                        alt={article.image.alt || article.title}
                                        className="h-full w-full object-cover object-center transition-transform duration-300 group-hover:scale-105"
                                    />
                                )}
                                {article.status && (
                                    <span className="absolute right-3 top-3 rounded-full bg-white/95 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-[#6e3a62ff] shadow-sm backdrop-blur-sm">
                                        {article.status}
                                    </span>
                                )}
                            </div>
                            <div className="flex min-w-0 flex-1 flex-col p-5">
                                <h2
                                    title={article.title}
                                    className="line-clamp-3 text-lg font-bold leading-6 text-gray-950"
                                >
                                    {article.title}
                                </h2>

                                <div className="mt-4 space-y-2 border-t border-gray-100 pt-4 text-xs text-gray-500">
                                    {article.author_name && (
                                        <p className="flex items-center gap-2">
                                            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-500">
                                                <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                                </svg>
                                            </span>
                                            <span className="truncate">Por {article.author_name}</span>
                                        </p>
                                    )}
                                    {article.updated_at && (
                                        <p className="flex items-center gap-2">
                                            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-500">
                                                <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                </svg>
                                            </span>
                                            <span>{formatarDataHora(article.updated_at)}</span>
                                        </p>
                                    )}
                                </div>
                            </div>
                            <div className="grid grid-cols-[1fr_auto] gap-3 border-t border-gray-100 bg-gray-50/70 p-4">
                                <button
                                    type="button"
                                    onClick={() => navigate(`edit/${article.slug}`)}
                                    className="flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                                >
                                    <FaEdit aria-hidden="true" />
                                    Editar matéria
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setArticleToDelete(article.slug)}
                                    aria-label={`Excluir ${article.title}`}
                                    title="Excluir matéria"
                                    className="flex h-10 w-10 items-center justify-center rounded-lg border border-red-200 bg-white text-red-600 transition-colors hover:border-red-300 hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                                >
                                    <FaTrashAlt aria-hidden="true" />
                                </button>
                            </div>
                        </article>
                    ))}
                </div>
            </main>
        </div>
    )
}
