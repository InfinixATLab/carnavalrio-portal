import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { gql } from "@apollo/client";
import { useQuery } from "@apollo/client/react";

import Header from "../components/Header/Header";
import Footer from "../components/Footer/Footer";
import Spinner from "../components/Spinner/Spinner";
import { formatarDataHora } from "../tools/Tools";
import type { News } from "../interfaces/News";
import { useSchools } from "../hooks/useRegions/useSchools";

type HomeNews = News & {
    authorName: string;
    updatedAt: string;
};

// Consulta paginada: recebe filtros e espera totalCount mais a lista resumida de notícias.
const GET_NEWS_AND_COUNT = gql`
    query GetNewsAndCount($school: String, $limit: Int, $offset: Int, $status: String, $title: String) {
        newsAndCount(school: $school, limit: $limit, offset: $offset, status: $status, title: $title) {
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
}
//Normaliza um texto de pesquisa
const normalizeSearchValue = (value: string | null | undefined) =>
    value
        ?.normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLocaleLowerCase("pt-BR") ?? "";

export default function Home() {
    // A página combina filtros da URL, busca textual e paginação para montar a vitrine de notícias.
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();

    const [currentPage, setCurrentPage] = useState(1);
    const [searchTerm, setSearchTerm] = useState("");
    const debouncedSearchTerm = useDebounce(searchTerm, 500);

    const {schools, loading: schoolsLoading, fetchSchools} = useSchools();

    const ITEMS_PER_PAGE = 11;

    // Apollo refaz a consulta apenas quando os filtros da listagem ou a página mudam.
    const { loading, error, data } = useQuery(GET_NEWS_AND_COUNT, {
        variables: {
            school: searchParams.get("school"),
            limit: ITEMS_PER_PAGE,
            offset: (currentPage - 1) * ITEMS_PER_PAGE,
            status: "Publicado",
            title: "",
        },
        fetchPolicy: "network-only"
    });

    useEffect(() => {
        // Uma nova pesquisa volta à primeira página para evitar offsets sem resultados.
        if (debouncedSearchTerm !== "") setCurrentPage(1);
    }, [debouncedSearchTerm]);

    useEffect(() => {
        // Carrega as escolas uma vez para converter seus IDs em nomes legíveis.
        (async() => {
            await fetchSchools();
        })();
    }, []);

    // Enriquece as notícias com o nome da escola e reparte o resultado em três seções visuais.
    const { highlight, mainList, remnantList } = useMemo(() => {
        const newsList = data?.newsAndCount?.news; // Property 'newsAndCount' does not exist on type '{}'.
        
        if (!newsList || newsList.length === 0) return { highlight: null, mainList: [], remnantList: [] };

        const normalizedSearchTerm = normalizeSearchValue(debouncedSearchTerm.trim());
        const filteredNews = normalizedSearchTerm
            ? newsList.filter((news: HomeNews) =>
                [news.title, news.image?.alt, news.slug, news.authorName].some((value) =>
                    normalizeSearchValue(value).includes(normalizedSearchTerm)
                )
            )
            : newsList;

        const schoolsMap = (schools || []).reduce((acc, s) => {
            acc[s.id] = s.name; // Element implicitly has an 'any' type because expression of type 'number' can't be used to index type '{}'. No index signature with a parameter of type 'number' was found on type '{}'.
            return acc;
        }, {});

        const newsEnhanced = filteredNews.map((n: HomeNews) => ({
            ...n,
            school: schoolsMap[Number(n.school)] || n.school
        }))

        return {
            highlight: newsEnhanced[0],
            mainList: newsEnhanced.slice(1, 5),
            remnantList: newsEnhanced.slice(5, 11),
        }
    }, [data, schools, debouncedSearchTerm]);

    const totalCount = data?.newsAndCount?.totalCount ?? 0;
    const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);

    // Os limites impedem navegar antes da primeira ou depois da última página.
    const handleNextPage = () => {
        setCurrentPage((prev) => Math.min(prev + 1, totalPages));
    };

    const handlePrevPage = () => {
        setCurrentPage((prev) => Math.max(prev - 1, 1));
    }

    const routeToArticle = (slug: string) => navigate(`radar/${slug}/`);

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
                {loading && data && <div className="text-center p-4">Atualizando...</div>}
                {error && <div className="text-center p-4">Nenhuma notícia publicada até o momento...</div>}
                
                {/* A primeira notícia recebe maior destaque visual. */}
                {highlight && (
                    <div onClick={() => routeToArticle(highlight.slug)} className="hover:cursor-pointer">
                        <p className="text-[#6e3a62ff] font-bold text-sm mb-2">
                            {highlight.school}
                        </p>
                        <div
                            className="bg-gray-200 h-[260px] sm:h-[320px] rounded-md flex items-end justify-start text-white overflow-hidden shadow-sm"
                            style={{
                                backgroundImage: `url('${highlight.image.url}')`,
                                backgroundPosition: "center",
                                backgroundRepeat: "no-repeat",
                                backgroundSize: "cover",
                            }}
                        >
                            <h2 className="w-full text-lg sm:text-xl font-bold bg-gray-900 bg-opacity-50 p-3">
                                {highlight.title}
                            </h2>
                        </div>
                        {highlight.image?.alt && (
                            <p className="text-sm text-gray-600 mt-2 leading-5">
                                {highlight.image.alt}
                            </p>
                        )}
                        <p className="text-xs text-gray-500 mt-2">
                            Publicado por {highlight.authorName} |{" "}
                            {formatarDataHora(highlight.updatedAt)}
                        </p>
                    </div>
                )}

                {/* Lista principal */}
                <div className="max-w-full overflow-x-hidden grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                    {mainList.map((item: HomeNews) => (
                        <article
                            key={item.id}
                            className="flex overflow-hidden border border-gray-200 bg-white shadow-sm rounded-md cursor-pointer transition-shadow hover:shadow-md"
                            onClick={() => routeToArticle(item.slug)}
                        >
                            {item.image && (
                                <div className="relative w-[38%] sm:w-1/3 min-h-[132px] bg-gray-100 overflow-hidden shrink-0">
                                    <img
                                        src={item.image.url}
                                        alt={item.image.alt || item.title}
                                        className="absolute inset-0 w-full h-full object-cover object-center"
                                    />
                                </div>
                            )}
                            <div className="flex flex-col grow p-3 min-w-0">
                                <p className="text-[#6e3a62ff] font-bold text-[10px] uppercase mb-1">{item.school}</p>
                                <h3 className="text-sm sm:text-base font-bold leading-5 text-gray-900">{item.title}</h3>
                                {item.image?.alt && (
                                    <p className="text-xs sm:text-sm text-gray-600 leading-4 mt-1.5">{item.image.alt}</p>
                                )}
                                <p className="text-[10px] sm:text-xs text-gray-500 mt-auto pt-2">
                                    Publicado por {item.authorName} | {formatarDataHora(item.updatedAt)}
                                </p>
                            </div>
                        </article>
                    ))}
                </div>

                {/* Restantes */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
                    {remnantList.map((item: HomeNews) => (
                        <article
                            key={item.id}
                            className="flex overflow-hidden border border-gray-200 bg-white shadow-sm rounded-md cursor-pointer transition-shadow hover:shadow-md"
                            onClick={() => routeToArticle(item.slug)}
                        >
                            {item.image && (
                                <div className="relative w-[38%] sm:w-1/3 min-h-[132px] bg-gray-100 overflow-hidden shrink-0">
                                    <img
                                        src={item.image.url}
                                        alt={item.image.alt || item.title}
                                        className="absolute inset-0 w-full h-full object-cover object-center"
                                    />
                                </div>
                            )}
                            <div className="flex flex-col grow p-3 min-w-0">
                                <p className="text-[#6e3a62ff] font-bold text-[10px] uppercase mb-1">{item.school}</p>
                                <h3 className="text-sm sm:text-base font-bold leading-5 text-gray-900">{item.title}</h3>
                                {item.image?.alt && (
                                    <p className="text-xs sm:text-sm text-gray-600 leading-4 mt-1.5">{item.image.alt}</p>
                                )}
                                <p className="text-[10px] sm:text-xs text-gray-500 mt-auto pt-2">
                                    Publicado por {item.authorName} | {formatarDataHora(item.updatedAt)}
                                </p>
                            </div>
                        </article>
                    ))}
                </div>

                {/* Controles de paginação (sem alterações) */}
                {totalPages > 1 && (
                    <div className="flex justify-center items-center space-x-6 mt-8">
                        <button
                            onClick={handlePrevPage}
                            className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
                            disabled={currentPage === 1 || loading}
                        >◀</button>
                        <span className="text-lg font-bold">{currentPage} de {totalPages}</span>
                        <button
                            onClick={handleNextPage}
                            className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
                            disabled={currentPage >= totalPages || loading}
                        >▶</button>
                    </div>
                )}
            </div>
            <Footer />
        </>
    );
}
