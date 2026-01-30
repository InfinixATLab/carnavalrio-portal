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

const useDebounce = (value: string, delay: number) => {
    const [debouncedValue, setDebouncedValue] = useState(value);
    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedValue(value);
        }, delay);

        return () => {
            clearTimeout(handler);
        };
    }, [value, delay]);

    return debouncedValue;
}

export default function Home() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();

    const [currentPage, setCurrentPage] = useState(1);
    const [searchTerm, setSearchTerm] = useState("");
    const debouncedSearchTerm = useDebounce(searchTerm, 500);

    const {schools, loading: schoolsLoading, fetchSchools} = useSchools();

    const ITEMS_PER_PAGE = 11;

    const { loading, error, data } = useQuery(GET_NEWS_AND_COUNT, {
        variables: {
            school: searchParams.get("school"),
            limit: ITEMS_PER_PAGE,
            offset: (currentPage - 1) * ITEMS_PER_PAGE,
            status: "Publicado",
            title: debouncedSearchTerm,
        },
        fetchPolicy: "network-only"
    });

    useEffect(() => {
        if (debouncedSearchTerm !== "") setCurrentPage(1);
    }, [debouncedSearchTerm]);

    useEffect(() => {
        (async() => {
            await fetchSchools();
        })();
    }, []);

    const { highlight, mainList, remnantList } = useMemo(() => {
        const newsList = data?.newsAndCount?.news; // Property 'newsAndCount' does not exist on type '{}'.
        
        if (!newsList || newsList.length === 0) return { highlight: null, mainList: [], remnantList: [] };

        const schoolsMap = (schools || []).reduce((acc, s) => {
            acc[s.id] = s.name; // Element implicitly has an 'any' type because expression of type 'number' can't be used to index type '{}'. No index signature with a parameter of type 'number' was found on type '{}'.
            return acc;
        }, {});

        const newsEnhanced = newsList.map((n: News) => ({
            ...n,
            school: schoolsMap[Number(n.school)] || n.school
        }))

        return {
            highlight: newsEnhanced[0],
            mainList: newsEnhanced.slice(1, 5),
            remnantList: newsEnhanced.slice(5, 11),
        }
    }, [data, schools]);

    const totalCount = data?.newsAndCount?.totalCount ?? 0;
    const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);

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

            <div className="bg-white py-4 px-4 space-y-4 min-h-screen md:max-w-[80%] lg:max-w-[50%] mx-auto">
                {loading && data && <div className="text-center p-4">Atualizando...</div>}
                {error && <div className="text-center p-4">Nenhuma notícia publicada até o momento...</div>}
                
                {highlight && (
                    <div onClick={() => routeToArticle(highlight.slug)} className="hover:cursor-pointer">
                        <p className="text-[#6e3a62ff] font-bold text-sm mb-2">
                            {highlight.school}
                        </p>
                        <div
                            className="bg-gray-200 h-[300px] rounded-sm flex items-end justify-start text-white"
                            style={{
                                backgroundImage: `url('${highlight.image.url}')`,
                                backgroundPosition: "center",
                                backgroundRepeat: "no-repeat",
                                backgroundSize: "cover",
                            }}
                        >
                            <h2 className="text-1xl font-bold bg-gray-900 bg-opacity-30 p-1">
                                {highlight.title}
                            </h2>
                        </div>
                        <p className="text-xs text-gray-600 mt-2 font-bold">
                            Publicado por {highlight.authorName} |{" "}
                            {formatarDataHora(highlight.updatedAt)}
                        </p>
                    </div>
                )}

                {/* Lista principal */}
                <div className="max-w-full overflow-x-hidden grid grid-cols-1 md:grid-cols-2 gap-4">
                    {mainList.map((item: News) => (
                        <div
                            key={item.id}
                            className="flex gap-4 items-start border border-gray-300 shadow-md py-4 px-2 rounded-md cursor-pointer"
                            onClick={() => routeToArticle(item.slug)}
                        >
                            {/* ATUALIZADO: checa 'item.image' */}
                            {item.image && (
                                <div className="w-1/2 h-full bg-gray-100 rounded-sm overflow-hidden">
                                    <img
                                        // ATUALIZADO: de 'item.preview.file' para 'item.image.fileUrl'
                                        src={item.image.url}
                                        // REMOVIDO: 'alt={item.preview.alt}' (você disse que removeu 'alt')
                                        className="w-full h-full object-cover"
                                    />
                                </div>
                            )}
                            <div className="flex flex-col flex-wrap w-1/2 grow">
                                <p className="text-[#6e3a62ff] font-bold text-sm">{item.school?.name}</p>
                                <p className="text-sm font-semibold max-w-full">{item.title}</p>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Restantes */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-6 rounded-md">
                    {remnantList.map((item: News) => (
                        <div
                            key={item.id}
                            className="bg-slate-950 bg-opacity-20 rounded-sm overflow-hidden shadow-lg cursor-pointer"
                            onClick={() => routeToArticle(item.slug)}
                        >
                            {/* ATUALIZADO: checa 'item.image' */}
                            {item.image && (
                                <img
                                    // ATUALIZADO: de 'item.preview.file' para 'item.image.fileUrl'
                                    src={item.image.url}
                                    // REMOVIDO: 'alt={item.preview.alt}'
                                    className="w-full h-32 object-cover shadow-lg"
                                />
                            )}
                            <div className="p-2">
                                {/* ATUALIZADO: de 'subjectName' para 'schoolName' */}
                                <p className="text-xs text-[#6e3a62ff]">{item.school?.name}</p>
                                <h3 className="text-sm font-semibold mt-1">{item.title}</h3>
                            </div>
                        </div>
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
