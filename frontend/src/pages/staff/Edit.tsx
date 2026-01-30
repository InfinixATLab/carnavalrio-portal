import { useEffect, useState } from "react";
import Header from "../../components/Header/Header";
import type { News } from "../../interfaces/News";
import RichTextEditor from "../../components/Quill/Quill";
import { ACCESS_TOKEN, NAME, SURNAME } from "../../constants/Token";
import api from "../../services/api";
import { formatarDataHora, slug } from "../../tools/Tools";
import axios from "axios";
import { useParams, useNavigate } from "react-router-dom"; // Importe useNavigate
import Spinner from "../../components/Spinner/Spinner";
import { HOST } from "../../constants/Host";
import { useSchools } from "../../hooks/useRegions/useSchools";
import type { Image } from "../../interfaces/Image";

const headers = () => ({
    "Authorization": `Bearer ${localStorage.getItem(ACCESS_TOKEN)}`
})

type UploadResult = { id: number } | { error: string }
type EditResult = { error?: string; data?: any };

async function upload(payload: any, pk?: any): Promise<UploadResult> {
    try {
        const endpoint = pk ? `upload/${pk}/` : 'upload/';
        
        const res = pk 
            ? await api.patch(endpoint, payload, { headers: headers() })
            : await api.post(endpoint, payload, { headers: headers() });

        return { id: res.data.id };
    } catch (err: any) {
        return { error: err.response?.data?.error || "Upload failed"};
    }
}

async function getArticle(slug: string): Promise<News> {
    try {
        const {data} = await api.get(slug + "/");
        return data;
    } catch (error: any) {
        console.error("Erro ao buscar a notícia: ", error)
        if (error.code === "ECONNABORTED") {
            throw new Error("Problemas de conexão. Tente novamente mais tarde.")
        } else if (error.response) {
            throw new Error(`Erro ${error.response.status}: ${error.response.statusText}`);
        } else {
            throw new Error("Erro inesperado ao carregar as notícias.");
        }
    }
}

// EditArticle agora recebe um payload que pode ter 'image' como ID
// Para evitar problemas de tipo, podemos ser mais flexíveis ou ajustar o payload
async function editArticle (payload: any, slug: string): Promise<EditResult> {
    
    // A checagem do ID agora será feita no handleSubmit antes de criar o payload
    
    try {
        const res = await api.patch(`news/${slug}/`, payload, {
            headers: headers(),
            validateStatus: () => true,
        });

        if (res.status >= 200 && res.status < 300) return { data: res.data };

        const errorData = res.data;
        return { error: errorData?.detail || errorData || "Erro ao publicar." };
    } catch (err) {
        if (axios.isAxiosError(err) && err.response) {
            return err.response.data || "Erro ao publicar.";
        }
        return { error: "Erro de conexão com o servidor. Tente novamente mais tarde." };
    }
}

// --- Funções de Erro (sem mudanças) ---
function getFriendlyError(error: unknown): string {
    // ... (seu código getFriendlyError aqui, sem mudanças)
    console.error(error)
    if (typeof error === "string") {
        if (error.includes("value too long")) {
            return "Nome ou subtítulo da imagem muito longo.";
        }
        if (error.includes("cannot identify image file")) {
            return "Formato de imagem inválido. Use JPG, JPEG, PNG ou WEBP.";
        }
        if (error.includes("token")) {
            return "Sua sessão expirou. Faça login novamente.";
        }
        return error; // Retorna o erro de string diretamente
    }

    if (typeof error === "object" && error !== null) {
        if ("code" in error && error.code === "token_not_valid") {
            return "Sessão expirada. Faça login novamente.";
        }
        if ("title" in error && Array.isArray(error.title)) {
            const msg = error.title.join(" ");
            if (msg.includes("blank")) return "Preencha o título."; 
            return "Título muito longo. Máximo de 255 caracteres.";
        }
        if ("body" in error && Array.isArray(error.body)) {
            const msg = error.body.join(" ");
            if (msg.includes("blank")) return "Preencha o corpo da notícia."; 
            return "Preencha o corpo da notícia.";
        }
        if ("image" in error) {
            return "Defina uma imagem de capa e um subtítulo!";
        }
        if ("detail" in error && typeof error.detail === "string") {
            return error.detail;
        }
        return "Erro de validação nos campos.";
    }

    return "Erro inesperado.";
}

// --- Componente Modal (Movido para fora) ---
type ErrorModalProps = {
    message: string;
    onClose?: () => void;
};

const ErrorModal = ({ message, onClose }: ErrorModalProps) => (
    <div className="px-2 fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-xl shadow-lg p-6 max-w-sm w-full">
            <h2 className="text-lg font-bold text-red-600 mb-2">Erro ao Salvar</h2>
            <p className="text-sm text-gray-800">{message}</p>
            <div className="mt-4 flex justify-end">
                <button
                    className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                    onClick={onClose}
                >
                    Fechar
                </button>
            </div>
        </div>
    </div>
);


// --- Componente Principal Refatorado ---

export default function Edit() {
    const { schools, loading: schoolsLoading, fetchSchools } = useSchools();
    const { slug: slugURL } = useParams();
    const navigate = useNavigate(); // Hook de navegação
    
    const [uploadError, setUploadError] = useState("");
    const [currentDateTime, setCurrentDateTime] = useState<Date>(new Date());
    const [isLoading, setIsLoading] = useState(true);
    const [imageChanged, setImageChanged] = useState(false);
    
    // Estado 'cover' agora é a fonte da verdade para a imagem sendo editada
    const [cover, setCover] = useState<Image | null>(null);
    
    // formData começa vazio e será preenchido pelo getArticle
    const [formData, setFormData] = useState<News | null>(null); // Começa como nulo

    // Busca escolas ao montar
    useEffect(() => {
        fetchSchools();
    }, []);

    // Busca o artigo ao montar ou quando o slug mudar
    useEffect(() => {
        const retrieveArticle = async () => {
            if (!slugURL) {
                console.error("Slug da URL não encontrado");
                setIsLoading(false);
                return;
            }

            try {
                setIsLoading(true);
                const art = await getArticle(slugURL);
                
                if (!art || !art.title) {
                    console.error("Dados do artigo inválidos:", art);
                    return;
                }
                
                setFormData(art);
                // Define o estado 'cover' com os dados da imagem do artigo
                setCover(art.image); 
                
                setImageChanged(false); // Reseta o flag
                
            } catch (error) {
                console.error("Erro ao carregar artigo:", error);
                setUploadError(getFriendlyError(error));
            } finally {
                setIsLoading(false);
            }
        }

        retrieveArticle();
    }, [slugURL]);

    // Timer para o relógio (sem mudanças)
    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentDateTime(new Date());
        }, 60 * 1000);

        return () => {
            clearInterval(timer);
        }
    }, [])

    // --- LÓGICA DE SUBMISSÃO REFEITA ---
    const handleSubmit = async () => {
        if (!formData) return; // Não faz nada se os dados não carregaram

        setIsLoading(true);
        setUploadError("");

        try {
            let imageIdToSubmit = formData.image.id; // ID da imagem original

            // 1. Verifica se a imagem mudou (novo arquivo OU novo alt)
            if (imageChanged) {
                
                // Caso 1: Um NOVO ARQUIVO foi selecionado
                if (cover.file instanceof File) {
                    const imagePayload = new FormData();
                    imagePayload.append('file', cover.file);
                    if (cover.alt) {
                        imagePayload.append('alt', cover.alt);
                    }
                    
                    // Cria um *novo* MediaFile
                    const uploadResult = await upload(imagePayload); 
                    
                    if ("error" in uploadResult) {
                        throw new Error(uploadResult.error); // Joga o erro para o catch
                    }
                    imageIdToSubmit = uploadResult.id; // Usa o ID da nova imagem
                
                // Caso 2: SOMENTE o texto 'alt' mudou
                } else if (cover.alt !== formData.image.alt) { 
                    const altPayload = { alt: cover.alt || "" };
                    
                    // Atualiza (PATCH) o MediaFile *existente*
                    const uploadResult = await upload(altPayload, formData.image.id);
                    
                    if ("error" in uploadResult) {
                        throw new Error(uploadResult.error);
                    }
                    // O ID da imagem continua o mesmo (imageIdToSubmit)
                }
            }

            // 2. Prepara o payload final para o artigo
            const identifier = slug(formData.title);
            const finalPayload = {
                ...formData,
                title: formData.title,
                body: formData.body,
                school: formData.school,
                image: imageIdToSubmit, // Envia APENAS O ID
                author_name: `${localStorage.getItem(NAME)} ${localStorage.getItem(SURNAME)}` || "",
                slug: identifier,
                link: `${HOST}radar/${identifier}`,
                status: 'Publicado',
            };

            // 3. Salva o artigo
            const res = await editArticle(finalPayload, slugURL || "");

            if (res.error) {
                throw res.error; // Joga o erro para o catch
            }

            // 4. Sucesso! Navega para o artigo
            navigate(finalPayload.link);

        } catch (err) {
            console.error("Erro no handleSubmit:", err);
            const friendly = getFriendlyError(err);
            setUploadError(friendly);
        } finally {
            setIsLoading(false); // Sempre para de carregar
        }
    }

    // Mostrar loading enquanto carrega os dados
    // Adicionado cheque para formData
    if (isLoading || schoolsLoading || !formData) {
        return (
            <div>
                <Header />
                <div className="flex flex-col justify-center items-center m-auto">
                    <p className="pt-20">Carregando artigo...</p>
                    <p className="pt-4"><Spinner /></p>
                </div>
            </div>
        );
    }

    // O JSX principal
    return (
        <div>
            {uploadError && (
                <ErrorModal
                    message={uploadError}
                    onClose={() => setUploadError("")}
                />
            )}

            <Header />
            <main className="mx-4 my-8 md:mx-auto md:max-w-[50%]">
                
                {/* --- SELETOR DE ESCOLA (CORRIGIDO) --- */}
                <div className="flex flex-wrap md:flex-nowrap justify-start gap-4">
                    <div className="my-4 w-full">
                        <label htmlFor="school" className="block text-sm font-medium text-gray-700 mb-1">
                            Selecione uma Escola (opcional)
                        </label>
                        <select
                            id="school"
                            value={formData.school || ""} // Usa || "" para valor controlado
                            onChange={(e) => setFormData({ ...formData, school: parseInt(e.target.value) || undefined })}
                            disabled={schoolsLoading} // Corrigido
                            className="w-full text-red-500 font-bold text-sm rounded-md  border border-gray-300 p-2 disabled:bg-gray-100 focus:outline-none focus:border-red-200 focus:transition-all focus:duration-200 focus:ring-1 focus:ring-red-200"
                        >
                            <option value="">
                                {schoolsLoading ? "Carregando..." : "Nenhuma"}
                            </option>
                            {/* Corrigido */}
                            {schools.filter(school => school.group === 1 || school.group === 2)
                                .map((school) => ( 
                                    <option key={school.id} value={school.id}>
                                        {school.name}
                                    </option>
                                )
                            )}
                        </select>
                    </div>
                </div>

                {/* --- TÍTULO --- */}
                <div>
                    <label htmlFor="titulo" className="block text-sm font-medium text-gray-700 mb-1">
                        Título da Notícia
                    </label>
                    <textarea
                        id="titulo"
                        value={formData.title}
                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                        required
                        className="w-full min-h-max border-b-2 border-black focus:outline-none focus:ring-1 focus:ring-white focus:border-transparent font-bold"
                    />
                </div>

                {/* --- DATA (OK) --- */}
                <div className="my-2">
                    <p className="text-xs text-gray-500">{formatarDataHora(currentDateTime)}</p>
                </div>

                {/* --- UPLOAD DE IMAGEM (REFEITO) --- */}
                <label htmlFor="file" className="w-full text-center text-sm my-6 mx-auto block">
                    <div
                        className="relative mb-2 bg-gray-200 px-6 py-4 rounded-sm my-1 min-h-[200px] h-[30vh] lg:h-[40vh]  flex items-center justify-center overflow-hidden"
                        style={{
                            // Usa 'cover.file_url' que agora guarda a URL original OU o preview
                            backgroundImage: cover.file_url ? `url(${cover.file_url})` : 'none',
                            backgroundPosition: 'center',
                            backgroundRepeat: 'no-repeat',
                            backgroundSize: "cover"
                        }}
                    >
                        {!cover.file_url && (
                            <p className="">Adicione uma foto de capa</p>
                        )}
                    </div>
                    <input
                        type="file"
                        id="file"
                        name="file"
                        className="hidden"
                        accept="image/*"
                        onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (!file) return;
                                
                                // Limpa preview antigo se houver
                                if (cover.file_url && cover.file_url.startsWith("blob:")) {
                                    URL.revokeObjectURL(cover.file_url);
                                }
                                
                                const preview = URL.createObjectURL(file);
                                
                                // 'file' é o objeto File, 'file_url' é o preview
                                setCover({ ...cover, file: file, file_url: preview});
                                setImageChanged(true); // Marca que a imagem mudou
                            }}
                    />
                    <p className="text-start text-sm ">Subtítulo da capa</p>
                    <textarea
                        id="alt"
                        name="alt"
                        value={cover.alt || ''} // Usa valor controlado com fallback
                        className="text-xs text-gray-600 border-b-2 border-black w-full min-h-max focus:outline-none focus:ring-1 focus:ring-white focus:border-transparent"
                        onChange={(e) => {
                            setCover({ ...cover, alt: e.target.value});
                            setImageChanged(true); // Marca que a imagem (metadados) mudou
                        }}
                    />
                </label>

                {/* --- CORPO DA NOTÍCIA --- */}
                <div className="my-8">
                    <label htmlFor="body" className="block text-sm font-medium text-gray-700 mb-1">
                        Corpo da Notícia
                    </label>
                    <RichTextEditor
                        value={formData.body}
                        onChange={(e) => {setFormData({ ...formData, body: e})}}
                        placeholder={"Escreva a notícia aqui..."}
                        className="min-h-[100px]"
                    />
                </div>

                {/* --- BOTÃO DE SALVAR --- */}
                <div className="flex flex-row-reverse w-full">
                    <button
                        onClick={handleSubmit}
                        className="w-full md:w-1/3 px-4 py-2 bg-blue-600 text-white rounded-md transition-colors self-end"
                        disabled={isLoading}
                    >
                        {isLoading ? "Salvando..." : "Salvar"}
                    </button>
                </div>
                <footer className="min-h-[2rem]"></footer>
            </main>
        </div>
    )
}