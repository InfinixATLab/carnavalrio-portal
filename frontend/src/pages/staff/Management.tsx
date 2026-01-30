import { useNavigate } from "react-router-dom";
import type { News } from "../../interfaces/News";
import api from "../../services/api";
import { useEffect, useState } from "react";
import { FaEdit, FaTrashAlt } from "react-icons/fa";

type ModalProps = {
    message: string;
    onConfirm?: () => void;
    onCancel?: () => void;
};

async function fetchNews(): Promise<News[]> {
    try {
        const {data} = await api.get("news/");
        
        return data.results;
    } catch (error: any) {
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

async function deleteArticle(slug: string): Promise<{ error: any } | { response: string}> {
    try {
        await api.delete(`news/${slug}/`)
    
        return { response: "Artigo deletado com sucesso." };
    } catch (err: any) {
        return { error: err };
    }
}


export default function Management() {
    const [searchTerm, setSearchTerm] = useState<string>("");
    const [news, setNews] = useState<News[]>([]);
    const [articleToDelete, setArticleToDelete] = useState<string | null>(null);
    const navigate = useNavigate();
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
        (async () => {
            try {
                await fetchNews().then(setNews);
            } catch (error) {
                setNews([]);
            }
        })();
    }, [])

    const remove = async (slug: string) => {
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
        <div className="py-8">
            {articleToDelete && (
                <Modal 
                    message="Ao continuar, esta matéria será deletada."
                    onConfirm={() => remove(articleToDelete)}
                    onCancel={() => setArticleToDelete("")}
                />
            )}
            <header className="px-4 text-center ">
                Gerenciamento de Notícias
            </header>
            <div className="px-4 my-8 flex flex-col gap-5 mx-auto sm:max-w-[80%] md:max-w-[60%] lg:max-w-[50%]">
                <div className="flex flex-col md:flex-row items-center gap-4">
                    {/* Add News Button */}
                    <button
                        onClick={() => navigate("publish/")}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center gap-2"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        <span className="no-wrap">Nova Matéria</span>
                    </button>
                    {/* Search */}
                    <div className="relative w-full">
                        <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
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
                            className="w-full pl-10 pr-4 my-2 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                    </div>
                </div>
                {/* News */}
                <div className="max-w-full overflow-x-hidden grid grid-cols-1 xl:grid-cols-2 gap-4">
                    {Array.isArray(news) && news.map((article, id) => { console.log(article);
                     return (
                        <div key={id} className="flex gap-4 items-start border border-gray-300 shadow-md py-4 px-2 rounded-md">
                            <div className="w-25 h-full bg-gray-100 rounded-sm overflow-hidden w-1/2">
                                {article.image && (
                                    <img
                                        src={article.image.file}
                                        className="w-full h-full object-cover object-center"
                                    />
                                )}
                            </div>
                            <div className="flex flex-col flex-wrap w-full grow sm:gap-1 md:justify-between">
                                <p className="text-sm font-semibold max-w-full">{article.title}</p>
                            </div>
                            <div className="flex gap-4 flex-col items-center">
                                <FaEdit
                                    className="cursor-pointer"
                                    onClick={() => navigate(`edit/${article.slug}`)}
                                />
                                <FaTrashAlt
                                    className="text-red-600 cursor-pointer"
                                    onClick={() => setArticleToDelete(article.slug)}
                                />
                            </div>
                        </div>
                    )})}
                </div>
            </div>
        </div>
    )
}
