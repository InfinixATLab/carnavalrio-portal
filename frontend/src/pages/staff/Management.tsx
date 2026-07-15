import { useNavigate } from 'react-router-dom';
import type { News } from '../../interfaces/News';
import type { PaginatedResponse } from '../../interfaces/PaginatedResponse';
import api from '../../services/api';
import axios from 'axios';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FaEdit, FaTrashAlt } from 'react-icons/fa';
import { formatarDataHora } from '../../tools/Tools';

type ModalProps = {
  message: string;
  onConfirm?: () => void;
  onCancel?: () => void;
};

type NewsBatch = {
  items: News[];
  remainingItems: News[];
};

// Configuração do scroll infinito: tamanho dos lotes, endpoint inicial e atraso de teste.
// O link `next` retornado pela API é usado nas consultas seguintes para preservar a ordem.
const INITIAL_NEWS_PAGE = 'news/?page_size=3';
const NEWS_BATCH_SIZE = 3;
const ARTIFICIAL_LOADING_DELAY_MS = 1800;

// Atraso artificial usado somente para visualizar e testar o loading.
// Para removê-lo depois, retire as chamadas desta função no carregamento inicial e incremental.
function waitForArtificialLoadingDelay(signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) {
      reject(new DOMException('Requisição cancelada', 'AbortError'));
      return;
    }

    const handleAbort = () => {
      window.clearTimeout(timer);
      reject(new DOMException('Requisição cancelada', 'AbortError'));
    };
    const timer = window.setTimeout(() => {
      signal.removeEventListener('abort', handleAbort);
      resolve();
    }, ARTIFICIAL_LOADING_DELAY_MS);

    signal.addEventListener('abort', handleAbort, { once: true });
  });
}

// Compara os slugs recebidos com os já exibidos para impedir cards duplicados.
function removeDuplicateNews(
  loadedNews: readonly News[],
  availableNews: readonly News[]
): News[] {
  const knownSlugs = new Set(loadedNews.map((article) => article.slug));
  return availableNews.filter((article) => {
    if (knownSlugs.has(article.slug)) return false;
    knownSlugs.add(article.slug);
    return true;
  });
}

// Remove itens já exibidos e separa, na ordem original, o próximo lote do buffer restante.
function createNewsBatch(
  loadedNews: readonly News[],
  availableNews: readonly News[]
): NewsBatch {
  const uniqueNews = removeDuplicateNews(loadedNews, availableNews);

  return {
    items: uniqueNews.slice(0, NEWS_BATCH_SIZE),
    remainingItems: uniqueNews.slice(NEWS_BATCH_SIZE),
  };
}

// Consulta uma página tipada da API e mantém `next`, `previous` e `count`
// disponíveis para o controle da paginação.
async function fetchNewsPage(
  page: string,
  signal?: AbortSignal
): Promise<PaginatedResponse<News>> {
  try {
    const { data } = await api.get<PaginatedResponse<News>>(page, { signal });
    return data;
  } catch (error: unknown) {
    if (signal?.aborted) throw error;
    console.error('Erro ao buscar notícias: ', error);

    if (axios.isAxiosError(error) && error.code === 'ECONNABORTED') {
      throw new Error('Problemas de conexão. Tente novamente mais tarde.');
    } else if (axios.isAxiosError(error) && error.response) {
      throw new Error(
        `Erro ${error.response.status}: ${error.response.statusText}`
      );
    } else {
      throw new Error('Erro inesperado ao carregar as notícias.');
    }
  }
}

// Durante a pesquisa, percorre todas as páginas para localizar também notícias
// que ainda não foram liberadas pelo scroll infinito.
async function fetchAllNews(signal?: AbortSignal): Promise<News[]> {
  const collectedNews: News[] = [];
  const visitedPages = new Set<string>();
  let nextPage: string | null = INITIAL_NEWS_PAGE;

  while (nextPage && !visitedPages.has(nextPage)) {
    const currentPage = nextPage;
    visitedPages.add(currentPage);
    const page = await fetchNewsPage(currentPage, signal);
    collectedNews.push(...page.results);
    nextPage = page.next;
  }

  return removeDuplicateNews([], collectedNews);
}
// Preserva a pesquisa sem diferenciar maiúsculas, minúsculas ou acentos.
const normalizeSearchValue = (value: string | null | undefined) =>
  value
    ?.normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('pt-BR') ?? '';

// Remove uma notícia pelo slug e converte sucesso ou falha em um resultado simples para a tela.
async function deleteArticle(
  slug: string
): Promise<{ error: unknown } | { response: string }> {
  try {
    await api.delete(`news/${slug}/`);

    return { response: 'Artigo deletado com sucesso.' };
  } catch (err: unknown) {
    return { error: err };
  }
}

export default function Management() {
  // Estados da busca: o valor digitado é separado do valor estabilizado pelo debounce.
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState<string>('');

  // Estados da listagem: `news` contém os cards visíveis e `pendingNews` mantém
  // resultados recebidos que serão exibidos nos próximos lotes de três.
  const [news, setNews] = useState<News[]>([]);
  const [pendingNews, setPendingNews] = useState<News[]>([]);

  // Estados da paginação: `nextPage` indica se a API possui outra página;
  // loading, conclusão inicial e erro controlam os elementos auxiliares da tela.
  const [nextPage, setNextPage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [initialLoadFinished, setInitialLoadFinished] =
    useState<boolean>(false);
  const [hasLoadError, setHasLoadError] = useState<boolean>(false);
  const [articleToDelete, setArticleToDelete] = useState<string | null>(null);

  // Referências do scroll e das requisições: evitam chamadas concorrentes,
  // permitem cancelamento e protegem contra respostas antigas ou após o unmount.
  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  const requestInProgressRef = useRef<boolean>(false);
  const requestIdRef = useRef<number>(0);
  const requestControllerRef = useRef<AbortController | null>(null);
  const newsRef = useRef<News[]>(news);
  const pendingNewsRef = useRef<News[]>(pendingNews);
  const nextPageRef = useRef<string | null>(nextPage);
  const isSearchActiveRef = useRef<boolean>(false);
  const navigate = useNavigate();

  // Condições derivadas centralizam as regras de continuação e finalização da lista.
  const isSearchActive = debouncedSearchTerm.length > 0;
  const hasMoreNews = nextPage !== null || pendingNews.length > 0;
  const shouldShowCompletionMessage =
    !isSearchActive &&
    initialLoadFinished &&
    !isLoading &&
    !hasLoadError &&
    !hasMoreNews &&
    news.length > 0;

  // Mantém os valores mais recentes disponíveis ao callback estável do observer.
  newsRef.current = news;
  pendingNewsRef.current = pendingNews;
  nextPageRef.current = nextPage;
  isSearchActiveRef.current = isSearchActive;
  // Caixa de confirmação local usada antes de uma exclusão permanente.
  const Modal = ({ message, onConfirm, onCancel }: ModalProps) => (
    <div className="px-2 fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-lg p-6 max-w-sm w-full">
        <h2 className="text-lg font-bold text-red-600 mb-2">
          Deseja continuar?
        </h2>
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

  // Aplica um pequeno debounce ao input sem alterar a normalização da pesquisa.
  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearchTerm(searchTerm.trim());
    }, 300);

    return () => window.clearTimeout(timer);
  }, [searchTerm]);

  // Cancela também o carregamento incremental ativo no unmount e invalida sua resposta.
  // Assim, nem a requisição nem o atraso artificial atualizam estado após a saída da página.
  useEffect(
    () => () => {
      requestIdRef.current += 1;
      requestControllerRef.current?.abort();
      requestInProgressRef.current = false;
    },
    []
  );

  // Carregamento principal: uma pesquisa busca todas as páginas; com o campo vazio,
  // a página reinicia no primeiro lote e volta a usar o scroll infinito.
  useEffect(() => {
    requestControllerRef.current?.abort();
    const controller = new AbortController();
    requestControllerRef.current = controller;
    const requestId = ++requestIdRef.current;
    requestInProgressRef.current = true;
    setIsLoading(true);
    setInitialLoadFinished(false);
    setHasLoadError(false);

    void (async () => {
      try {
        if (isSearchActive) {
          const loadedNews = await fetchAllNews(controller.signal);
          if (requestId !== requestIdRef.current) return;
          setNews(loadedNews);
          setPendingNews([]);
          setNextPage(null);
        } else {
          const [firstPage] = await Promise.all([
            fetchNewsPage(INITIAL_NEWS_PAGE, controller.signal),
            waitForArtificialLoadingDelay(controller.signal),
          ]);
          if (requestId !== requestIdRef.current) return;
          const firstBatch = createNewsBatch([], firstPage.results);
          setNews(firstBatch.items);
          setPendingNews(firstBatch.remainingItems);
          setNextPage(firstPage.next);
        }
      } catch (error) {
        if (controller.signal.aborted || requestId !== requestIdRef.current)
          return;
        setNews([]);
        setPendingNews([]);
        setNextPage(null);
        setHasLoadError(true);
      } finally {
        if (requestId === requestIdRef.current) {
          requestInProgressRef.current = false;
          setIsLoading(false);
          setInitialLoadFinished(true);
        }
      }
    })();

    return () => controller.abort();
  }, [debouncedSearchTerm, isSearchActive]);

  // Carrega o próximo lote somente fora da busca. A referência síncrona bloqueia
  // chamadas duplicadas mesmo que o observer dispare mais de uma vez antes do React renderizar.
  const loadMoreNews = useCallback(async () => {
    const pendingItems = pendingNewsRef.current;
    const followingPageUrl = nextPageRef.current;
    if (
      isSearchActiveRef.current ||
      (!followingPageUrl && pendingItems.length === 0) ||
      requestInProgressRef.current
    )
      return;

    const controller = new AbortController();
    requestControllerRef.current = controller;
    const requestId = ++requestIdRef.current;
    requestInProgressRef.current = true;
    setIsLoading(true);
    setHasLoadError(false);

    try {
      let availableNews = pendingItems;
      let followingPage = followingPageUrl;

      // Só consulta outra página quando o buffer local não consegue completar o próximo lote.
      if (availableNews.length < NEWS_BATCH_SIZE && followingPage) {
        const [page] = await Promise.all([
          fetchNewsPage(followingPage, controller.signal),
          waitForArtificialLoadingDelay(controller.signal),
        ]);
        availableNews = [...availableNews, ...page.results];
        followingPage = page.next;
      } else {
        await waitForArtificialLoadingDelay(controller.signal);
      }

      if (requestId !== requestIdRef.current) return;
      const nextBatch = createNewsBatch(newsRef.current, availableNews);

      // Acrescenta até três notícias inéditas abaixo das anteriores, preservando a ordem da API.
      setNews((currentNews) => [...currentNews, ...nextBatch.items]);
      setPendingNews(nextBatch.remainingItems);
      // A ausência de `next` na resposta interrompe definitivamente novas consultas.
      setNextPage(followingPage);
    } catch (error) {
      if (!controller.signal.aborted) {
        console.error(error);
        setHasLoadError(true);
      }
    } finally {
      if (requestId === requestIdRef.current) {
        requestInProgressRef.current = false;
        setIsLoading(false);
      }
    }
  }, []);

  // Observa o marcador no final da lista e antecipa o próximo lote quando ele
  // se aproxima da tela. A quantidade exibida rearma o observer após cada lote,
  // inclusive quando o marcador permanece visível e não gera uma nova transição sozinho.
  useEffect(() => {
    const target = loadMoreRef.current;
    if (!target || isSearchActive || !hasMoreNews) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) void loadMoreNews();
      },
      { rootMargin: '300px 0px' }
    );

    observer.observe(target);
    return () => observer.disconnect();
  }, [hasMoreNews, isSearchActive, loadMoreNews, news.length]);

  // Filtra em memória o conjunto completo obtido durante a pesquisa, mantendo
  // os mesmos campos e a mesma normalização sem acentos e sem diferença de caixa.
  const visibleNews = useMemo(() => {
    const normalizedTerm = normalizeSearchValue(debouncedSearchTerm);
    if (!normalizedTerm) return news;

    return news.filter((article) =>
      [
        article.title,
        article.slug,
        article.author_name,
        article.status,
        article.image?.alt,
      ].some((value) => normalizeSearchValue(value).includes(normalizedTerm))
    );
  }, [debouncedSearchTerm, news]);

  const remove = async (slug: string) => {
    // Após a API responder, retira o item localmente para evitar uma segunda consulta completa.
    try {
      await deleteArticle(slug);
      setNews((prev) => prev?.filter((article) => article.slug !== slug));
    } catch (error: unknown) {
      console.error(error);
    } finally {
      setArticleToDelete(null);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 sm:py-10">
      {articleToDelete && (
        /* O modal bloqueia a exclusão até o usuário confirmar ou cancelar. */
        <Modal
          message="Ao continuar, esta matéria será deletada."
          onConfirm={() => remove(articleToDelete)}
          onCancel={() => setArticleToDelete('')}
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
            onClick={() => navigate('publish/')}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-5 py-3 font-semibold text-white shadow-sm transition-all duration-200 hover:bg-blue-700 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 md:w-auto"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v16m8-8H4"
              />
            </svg>
            <span className="no-wrap">Nova Matéria</span>
          </button>
          {/* Search */}
          <div className="relative w-full md:flex-1">
            <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
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
          {Array.isArray(visibleNews) &&
            visibleNews.map((article) => (
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
                          <svg
                            className="h-3.5 w-3.5"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                            />
                          </svg>
                        </span>
                        <span className="truncate">
                          Por {article.author_name}
                        </span>
                      </p>
                    )}
                    {article.updated_at && (
                      <p className="flex items-center gap-2">
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-500">
                          <svg
                            className="h-3.5 w-3.5"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                            />
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
        {/* Marcador observado somente enquanto a listagem normal ainda possui próxima página. */}
        {!isSearchActive && hasMoreNews && (
          <div ref={loadMoreRef} className="h-1" aria-hidden="true" />
        )}
        {/* Três bolinhas centralizadas representam tanto o loading inicial quanto o incremental. */}
        {isLoading && (
          <div
            className="flex items-center justify-center gap-2 py-4"
            role="status"
            aria-label="Carregando notícias"
          >
            <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-[#b98bad]" />
            <span
              className="h-2.5 w-2.5 animate-pulse rounded-full bg-[#6e3a62]"
              style={{ animationDelay: '150ms' }}
            />
            <span
              className="h-2.5 w-2.5 animate-pulse rounded-full bg-[#3f2138]"
              style={{ animationDelay: '300ms' }}
            />
          </div>
        )}
        {/* A mensagem final aparece após a consulta, com itens encontrados e sem próxima página. */}
        {shouldShowCompletionMessage && (
          <p className="py-4 text-center text-sm font-medium text-gray-500">
            Todas as notícias foram carregadas
          </p>
        )}
      </main>
    </div>
  );
}
