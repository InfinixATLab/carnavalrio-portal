import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { gql } from '@apollo/client';
import { useQuery } from '@apollo/client/react';

import Header from '../components/Header/Header';
import Footer from '../components/Footer/Footer';
import Spinner from '../components/Spinner/Spinner';
import { formatarDataHora } from '../tools/Tools';
import type { News } from '../interfaces/News';
import { useSchools } from '../hooks/useRegions/useSchools';

// Recorte da entidade News correspondente exatamente aos campos retornados pelo GraphQL da Home.
type HomeNews = Pick<
  News,
  'title' | 'slug' | 'status' | 'link' | 'school' | 'image'
> & {
  id: number;
  authorName: string;
  author: Pick<News['author'], 'name' | 'surname' | 'email'> & {
    id: number;
  };
  createdAt: string;
  updatedAt: string;
};

type NewsAndCount = {
  totalCount: number;
  news: HomeNews[];
};

type GetNewsAndCountData = {
  newsAndCount: NewsAndCount | null;
};

type GetNewsAndCountVariables = {
  school: string | null;
  limit: number | null;
  offset: number;
  status: string;
  title: string;
};

// Cada consulta normal recebe sete notícias: uma vira destaque e seis iniciam a grade.
const ITEMS_PER_PAGE = 7;

// Atraso mínimo apenas para facilitar a visualização do loading em desenvolvimento.
// Pode ser reduzido ou removido em produção.
const MINIMUM_LOADING_TIME = 1200;

function waitForMinimumLoadingTime(signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    // Uma operação já cancelada não deve criar um novo temporizador.
    if (signal.aborted) {
      reject(new DOMException('Requisição cancelada', 'AbortError'));
      return;
    }

    // O AbortController limpa o timeout quando o filtro muda ou a página é desmontada.
    const handleAbort = () => {
      window.clearTimeout(timer);
      reject(new DOMException('Requisição cancelada', 'AbortError'));
    };
    const timer = window.setTimeout(() => {
      signal.removeEventListener('abort', handleAbort);
      resolve();
    }, MINIMUM_LOADING_TIME);

    signal.addEventListener('abort', handleAbort, { once: true });
  });
}

// Acrescenta somente notícias inéditas, considerando tanto o id quanto o slug.
function appendUniqueNews(
  loadedNews: readonly HomeNews[],
  newNews: readonly HomeNews[]
): HomeNews[] {
  const knownIds = new Set(loadedNews.map((article) => article.id));
  const knownSlugs = new Set(loadedNews.map((article) => article.slug));
  const uniqueNews = newNews.filter((article) => {
    if (knownIds.has(article.id) || knownSlugs.has(article.slug)) return false;
    knownIds.add(article.id);
    knownSlugs.add(article.slug);
    return true;
  });

  return [...loadedNews, ...uniqueNews];
}

// Consulta paginada: recebe filtros e espera totalCount mais a lista resumida de notícias.
const GET_NEWS_AND_COUNT = gql`
  query GetNewsAndCount(
    $school: String
    $limit: Int
    $offset: Int
    $status: String
    $title: String
  ) {
    newsAndCount(
      school: $school
      limit: $limit
      offset: $offset
      status: $status
      title: $title
    ) {
      totalCount
      news {
        id
        title
        slug
        status
        link
        school
        authorName
        author {
          id
          name
          surname
          email
        }
        createdAt
        updatedAt
        image {
          id
          alt
          url
        }
      }
    }
  }
`;

// Atrasa a aplicação da busca para não consultar a API a cada tecla digitada.
const useDebounce = (value: string, delay: number) => {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    // Reinicia o temporizador sempre que o texto ou o intervalo mudar.
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
};
//Normaliza um texto de pesquisa
const normalizeSearchValue = (value: string | null | undefined) =>
  value
    ?.normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('pt-BR') ?? '';

export default function Home() {
  // A página combina filtros da URL, busca textual e scroll infinito para montar a vitrine de notícias.
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  // Estados da pesquisa e da lista acumulada exibida pelo scroll infinito.
  const [searchTerm, setSearchTerm] = useState('');
  const [loadedNews, setLoadedNews] = useState<HomeNews[]>([]);
  const [visibleSearchNewsCount, setVisibleSearchNewsCount] =
    useState(ITEMS_PER_PAGE);
  const [receivedNewsCount, setReceivedNewsCount] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [incrementalLoadingStopped, setIncrementalLoadingStopped] =
    useState(false);

  // A busca mantém o debounce e a normalização já usados pela página.
  const debouncedSearchTerm = useDebounce(searchTerm, 500);
  const normalizedSearchTerm = normalizeSearchValue(
    debouncedSearchTerm.trim()
  );
  const schoolFilter = searchParams.get('school');

  // As escolas são carregadas separadamente para trocar o id pelo nome nos cards.
  const { schools, fetchSchools } = useSchools();

  // Referências mutáveis permitem ao observer consultar valores atuais sem depender
  // apenas do ciclo assíncrono de atualização de estado do React.
  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  const fetchMoreInProgressRef = useRef(false);
  const requestGenerationRef = useRef(0);
  const loadingDelayControllerRef = useRef<AbortController | null>(null);
  const loadedNewsRef = useRef<readonly HomeNews[]>(loadedNews);
  const queryVariablesRef = useRef<GetNewsAndCountVariables>({
    school: schoolFilter,
    limit: normalizedSearchTerm ? null : ITEMS_PER_PAGE,
    offset: 0,
    status: 'Publicado',
    title: '',
  });
  const isSearchActiveRef = useRef(normalizedSearchTerm.length > 0);
  const visibleSearchNewsCountRef = useRef(visibleSearchNewsCount);
  const receivedNewsCountRef = useRef(receivedNewsCount);
  const searchResultCountRef = useRef(0);
  const hasMoreNewsRef = useRef(false);
  const initialLoadingRef = useRef(false);

  // A consulta sempre reinicia no offset zero quando a pesquisa ou escola muda.
  // Na busca, limit continua nulo para preservar a filtragem local existente.
  const queryVariables = useMemo<GetNewsAndCountVariables>(
    () => ({
      school: schoolFilter,
      limit: normalizedSearchTerm ? null : ITEMS_PER_PAGE,
      offset: 0,
      status: 'Publicado',
      title: '',
    }),
    [normalizedSearchTerm, schoolFilter]
  );

  // Apollo refaz a consulta quando os filtros mudam; os próximos lotes usam fetchMore.
  const { loading, error, data, fetchMore } = useQuery<
    GetNewsAndCountData,
    GetNewsAndCountVariables
  >(GET_NEWS_AND_COUNT, {
    variables: queryVariables,
    fetchPolicy: 'network-only',
  });

  // Uma nova pesquisa ou escola invalida carregamentos anteriores e reinicia a vitrine.
  useEffect(() => {
    requestGenerationRef.current += 1;
    loadingDelayControllerRef.current?.abort();
    fetchMoreInProgressRef.current = false;
    setLoadedNews([]);
    setVisibleSearchNewsCount(ITEMS_PER_PAGE);
    setReceivedNewsCount(0);
    setTotalCount(0);
    setIsLoadingMore(false);
    setIncrementalLoadingStopped(false);
  }, [normalizedSearchTerm, schoolFilter]);

  useEffect(
    () => () => {
      // Invalida respostas pendentes e cancela o atraso ao sair da Home.
      requestGenerationRef.current += 1;
      loadingDelayControllerRef.current?.abort();
      fetchMoreInProgressRef.current = false;
    },
    []
  );

  useEffect(() => {
    // Carrega as escolas uma vez para converter seus IDs em nomes legíveis.
    (async () => {
      await fetchSchools();
    })();
  }, []);

  // Sincroniza somente a resposta inicial do filtro ativo; respostas incrementais são acumuladas abaixo.
  useEffect(() => {
    if (loading || fetchMoreInProgressRef.current || !data?.newsAndCount)
      return;

    const initialNews = appendUniqueNews([], data.newsAndCount.news);
    setLoadedNews(initialNews);
    setReceivedNewsCount(data.newsAndCount.news.length);
    setTotalCount(data.newsAndCount.totalCount);
    setIncrementalLoadingStopped(
      initialNews.length === 0 && data.newsAndCount.totalCount > 0
    );
  }, [data, loading]);

  // Enriquece as notícias com o nome da escola e reparte o resultado em duas seções visuais.
  const { highlight, newsList, searchResultCount } = useMemo(() => {
    if (loadedNews.length === 0)
      return {
        highlight: null,
        newsList: [],
        searchResultCount: 0,
      };

    // A pesquisa continua abrangendo título, texto alternativo, slug e autor.
    const filteredNews = normalizedSearchTerm
      ? loadedNews.filter((news) =>
          [news.title, news.image?.alt, news.slug, news.authorName].some(
            (value) =>
              normalizeSearchValue(value).includes(normalizedSearchTerm)
          )
        )
      : loadedNews;

    // Como a busca já recebe todos os resultados, o scroll apenas libera mais sete por vez.
    const visibleNews = normalizedSearchTerm
      ? filteredNews.slice(0, visibleSearchNewsCount)
      : filteredNews;

    // O mapa evita procurar repetidamente a escola de cada notícia.
    const schoolsMap = new Map(
      schools.map((school) => [school.id, school.name])
    );

    const newsEnhanced = visibleNews.map((n) => ({
      ...n,
      school: schoolsMap.get(Number(n.school)) || n.school,
    }));

    return {
      // Somente o primeiro item do conjunto atual ocupa o destaque; os demais ficam na grade.
      highlight: newsEnhanced[0],
      newsList: newsEnhanced.slice(1),
      searchResultCount: filteredNews.length,
    };
  }, [loadedNews, normalizedSearchTerm, schools, visibleSearchNewsCount]);

  const isSearchActive = normalizedSearchTerm.length > 0;
  const displayedNewsCount = highlight ? newsList.length + 1 : 0;

  // Na busca, compara itens visíveis e encontrados. Na listagem normal, compara
  // o total recebido da API com totalCount e respeita interrupções preventivas.
  const hasMoreNews = isSearchActive
    ? displayedNewsCount < searchResultCount
    : !incrementalLoadingStopped && receivedNewsCount < totalCount;
  const allNewsLoaded = isSearchActive
    ? searchResultCount > 0 && displayedNewsCount >= searchResultCount
    : totalCount > 0 && receivedNewsCount >= totalCount;
  const shouldShowCompletionMessage =
    !loading && !isLoadingMore && !hasMoreNews && allNewsLoaded;

  // Mantém o callback estável de carregamento sincronizado com o render mais recente.
  loadedNewsRef.current = loadedNews;
  queryVariablesRef.current = queryVariables;
  isSearchActiveRef.current = isSearchActive;
  visibleSearchNewsCountRef.current = visibleSearchNewsCount;
  receivedNewsCountRef.current = receivedNewsCount;
  searchResultCountRef.current = searchResultCount;
  hasMoreNewsRef.current = hasMoreNews;
  initialLoadingRef.current = loading && !data;

  // Carrega ou revela o próximo lote, com bloqueio síncrono contra chamadas concorrentes.
  const loadMoreNews = useCallback(async (): Promise<void> => {
    // Não inicia durante a primeira consulta, durante outro lote ou depois do fim da lista.
    if (
      initialLoadingRef.current ||
      fetchMoreInProgressRef.current ||
      !hasMoreNewsRef.current
    )
      return;

    const requestGeneration = requestGenerationRef.current;
    const controller = new AbortController();
    loadingDelayControllerRef.current = controller;
    fetchMoreInProgressRef.current = true;
    setIsLoadingMore(true);

    try {
      // A busca preserva sua consulta completa e revela localmente mais sete resultados.
      if (isSearchActiveRef.current) {
        await waitForMinimumLoadingTime(controller.signal);
        if (requestGeneration !== requestGenerationRef.current) return;

        setVisibleSearchNewsCount(
          Math.min(
            visibleSearchNewsCountRef.current + ITEMS_PER_PAGE,
            searchResultCountRef.current
          )
        );
        return;
      }

      // O offset inclui todas as notícias recebidas, inclusive a notícia em destaque.
      const offset = receivedNewsCountRef.current;

      // A requisição e o tempo mínimo do loading começam juntos.
      const nextPageRequest = fetchMore({
        variables: {
          ...queryVariablesRef.current,
          limit: ITEMS_PER_PAGE,
          offset,
        },
      });
      const [nextPage] = await Promise.all([
        nextPageRequest,
        waitForMinimumLoadingTime(controller.signal),
      ]);

      // Uma troca de pesquisa ou escola torna esta resposta obsoleta.
      if (requestGeneration !== requestGenerationRef.current) return;
      const nextResult = nextPage.data?.newsAndCount;
      const nextNews = nextResult?.news ?? [];

      // Uma página vazia encerra o scroll para impedir requisições em loop.
      if (nextNews.length === 0) {
        setIncrementalLoadingStopped(true);
        return;
      }

      // Atualiza o total informado pelo backend e acrescenta apenas itens inéditos.
      if (nextResult) setTotalCount(nextResult.totalCount);
      const mergedNews = appendUniqueNews(loadedNewsRef.current, nextNews);
      setReceivedNewsCount(offset + nextNews.length);
      setLoadedNews(mergedNews);
      // Um lote inteiramente duplicado também encerra o carregamento incremental.
      if (mergedNews.length === loadedNewsRef.current.length)
        setIncrementalLoadingStopped(true);
    } catch (loadMoreError) {
      // Cancelamentos esperados não são registrados como falhas de carregamento.
      if (!controller.signal.aborted) console.error(loadMoreError);
    } finally {
      // Uma requisição antiga não pode liberar o bloqueio pertencente ao filtro atual.
      if (requestGeneration === requestGenerationRef.current) {
        fetchMoreInProgressRef.current = false;
        setIsLoadingMore(false);
      }
    }
  }, [fetchMore]);

  // O marcador antecipa o próximo lote e é rearmado apenas quando a lista cresce.
  useEffect(() => {
    const target = loadMoreRef.current;
    if (!target || !hasMoreNews || loading || isLoadingMore) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) void loadMoreNews();
      },
      { rootMargin: '300px 0px' }
    );

    observer.observe(target);
    return () => observer.disconnect();
  }, [hasMoreNews, isLoadingMore, loadMoreNews, loadedNews.length, loading]);

  const routeToArticle = (slug: string) => navigate(`radar/${slug}/`);

  // O spinner de página inteira permanece restrito ao primeiro carregamento.
  if (loading && !data) return <Spinner />;

  return (
    <>
      <Header />
      {/* Campo de busca controlado; o valor estabilizado filtra as notícias já carregadas. */}
      <div className="relative max-w-[80%] md:max-w-[50%] mx-auto p-4">
        <div className="absolute left-8 top-1/2 transform -translate-y-1/2 text-gray-400">
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
          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      <div className="bg-white py-4 px-4 space-y-3 min-h-screen md:max-w-[80%] lg:max-w-[50%] mx-auto">
        {/* Mantém os tratamentos visuais preexistentes para atualização e erro. */}
        {loading && data && (
          <div className="text-center p-4">Atualizando...</div>
        )}
        {error && (
          <div className="text-center p-4">
            Nenhuma notícia publicada até o momento...
          </div>
        )}

        {/* A primeira notícia recebe maior destaque visual. */}
        {highlight && (
          <div
            onClick={() => routeToArticle(highlight.slug)}
            className="group hover:cursor-pointer rounded-lg transition-all duration-300 hover:shadow-xl hover:-translate-y-0.5"
          >
            <div className="relative bg-gray-200 h-[260px] sm:h-[320px] rounded-lg overflow-hidden shadow-md">
              {highlight.image?.url && (
                <img
                  src={highlight.image.url}
                  alt={highlight.image.alt || highlight.title}
                  className="absolute inset-0 w-full h-full object-cover object-center transition-transform duration-500 group-hover:scale-105"
                />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 p-4 sm:p-5">
                <p className="text-xs font-bold uppercase tracking-wide text-white/80 mb-2">
                  {highlight.school}
                </p>
                <h2
                  title={highlight.title}
                  className="text-xl sm:text-2xl font-bold leading-tight text-white line-clamp-3"
                >
                  {highlight.title}
                </h2>
              </div>
            </div>
            {highlight.image?.alt && (
              <p className="text-sm text-gray-600 mt-3 leading-6 line-clamp-2">
                {highlight.image.alt}
              </p>
            )}
            <p className="text-xs text-gray-400 mt-3 pt-3 border-t border-gray-100">
              Publicado por {highlight.authorName} |{' '}
              {formatarDataHora(highlight.updatedAt)}
            </p>
          </div>
        )}

        {/* Lista principal: começa com seis cards e recebe sete a cada novo lote. */}
        <div className="max-w-full overflow-x-hidden grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
          {newsList.map((item: HomeNews) => (
            <article
              key={item.id}
              className="group h-[190px] flex overflow-hidden border border-gray-100 bg-white shadow-sm rounded-lg cursor-pointer transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5"
              onClick={() => routeToArticle(item.slug)}
            >
              <div className="relative w-[38%] sm:w-1/3 h-full bg-gray-100 overflow-hidden shrink-0">
                {item.image?.url && (
                  <img
                    src={item.image.url}
                    alt={item.image.alt || item.title}
                    className="absolute inset-0 w-full h-full object-cover object-center transition-transform duration-300 group-hover:scale-105"
                  />
                )}
              </div>
              <div className="flex flex-col grow p-4 min-w-0">
                <p className="text-[#6e3a62ff] font-bold text-[10px] uppercase mb-1 tracking-wide">
                  {item.school}
                </p>
                <h3
                  title={item.title}
                  className="text-sm sm:text-base font-bold leading-5 text-gray-950 line-clamp-2"
                >
                  {item.title}
                </h3>
                {item.image?.alt && (
                  <p className="text-xs sm:text-sm text-gray-600 leading-4 mt-1.5 line-clamp-2">
                    {item.image.alt}
                  </p>
                )}
                <p className="text-[10px] sm:text-xs text-gray-400 mt-auto pt-2 border-t border-gray-100">
                  Publicado por {item.authorName} |{' '}
                  {formatarDataHora(item.updatedAt)}
                </p>
              </div>
            </article>
          ))}
        </div>

        {/* Marcador invisível observado somente enquanto ainda existem notícias. */}
        {hasMoreNews && (
          <div ref={loadMoreRef} className="h-1" aria-hidden="true" />
        )}
        {/* Loading incremental abaixo dos cards, sem substituir o conteúdo existente. */}
        {isLoadingMore && (
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
        {/* Confirma a conclusão somente após o último lote terminar. */}
        {shouldShowCompletionMessage && (
          <p className="py-4 text-center text-sm font-medium text-gray-500">
            Todas as notícias já foram carregadas.
          </p>
        )}
      </div>
      <Footer />
    </>
  );
}
