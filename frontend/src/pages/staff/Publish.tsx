import { useEffect, useState } from "react";
import Header from "../../components/Header/Header";
import RichTextEditor from "../../components/Quill/Quill";
import { ACCESS_TOKEN, NAME, SURNAME } from "../../constants/Token";
import api from "../../services/api";
import { formatarDataHora, slug } from "../../tools/Tools";
import axios from "axios";
import { useSchools } from "../../hooks/useRegions/useSchools";
import { HOST } from "../../constants/Host";
import Spinner from "../../components/Spinner/Spinner";
import type {
    ApiValidationErrors,
    CreateNewsPayload,
    CreateNewsResponse,
    NewsCreationForm,
    UploadImageResponse,
} from "../../interfaces/NewsPublication";

// --- Funções da API (com correção) ---

const headers = () => ({
    "Authorization": `Bearer ${localStorage.getItem(ACCESS_TOKEN)}`
})

// Envia a capa em multipart e espera o identificador numérico do arquivo criado.
async function upload(payload: FormData): Promise<UploadImageResponse> {
    const res = await api.post<UploadImageResponse>("upload/", payload, {
        headers: headers()
    });
    return res.data;
}

// Valida localmente o ID da capa antes de criar a notícia com um corpo JSON completo.
async function publishNews(payload: CreateNewsPayload): Promise<CreateNewsResponse> {
    if (!payload.image || typeof payload.image !== "number" || payload.image < 0) {
        throw new Error("Imagem de capa inválida ou ausente.");
    }

    const res = await api.post<CreateNewsResponse>("news/", payload, {
        headers: headers(),
    });
    return res.data;
}

// --- Tratamento de Erro ---

// Uniformiza mensagens que podem chegar como texto único ou vetor de textos.
function validationMessage(value: unknown): string | null {
    if (typeof value === "string") {
        return value;
    }

    if (Array.isArray(value)) {
        const messages = value.filter((item): item is string => typeof item === "string");
        return messages.length ? messages.join(" ") : null;
    }

    return null;
}

// Procura erros conhecidos por prioridade e usa qualquer outro campo como alternativa.
function getApiValidationMessage(data: ApiValidationErrors): string | null {
    const slugMessage = validationMessage(data.slug);
    if (slugMessage) return slugMessage;

    const titleMessage = validationMessage(data.title);
    if (titleMessage) {
        if (titleMessage.includes("blank")) return "Preencha o título.";
        return titleMessage;
    }

    const bodyMessage = validationMessage(data.body);
    if (bodyMessage) {
        if (bodyMessage.includes("blank")) return "Preencha o corpo da notícia.";
        return bodyMessage;
    }

    const imageMessage = validationMessage(data.image);
    if (imageMessage) return imageMessage;

    const detailMessage = validationMessage(data.detail);
    if (detailMessage) return detailMessage;

    const errorMessage = validationMessage(data.error);
    if (errorMessage) return errorMessage;

    for (const value of Object.values(data)) {
        const message = validationMessage(value);
        if (message) return message;
    }

    return null;
}

// Traduz falhas HTTP, validações e erros locais para a mensagem exibida no modal.
function getFriendlyError(error: unknown): string {
    console.error(error);

    if (axios.isAxiosError<ApiValidationErrors>(error)) {
        const apiMessage = error.response?.data
            ? getApiValidationMessage(error.response.data)
            : null;

        if (apiMessage) return apiMessage;
        if (error.response) return "Erro de validação nos campos.";
        return "Erro de conexão com o servidor. Tente novamente mais tarde.";
    }

    if (error instanceof Error) {
        if (error.message.includes("value too long")) {
            return "Nome ou subtítulo da imagem muito longo.";
        }
        if (error.message.includes("cannot identify image file")) {
            return "Formato de imagem inválido. Use JPG, JPEG, PNG ou WEBP.";
        }
        if (error.message.includes("token")) {
            return "Sua sessão expirou. Faça login novamente.";
        }
        return error.message;
    }

    if (typeof error === "string") {
        return error;
    }

    return "Erro de validação nos campos.";
}

// --- Componente Modal (Movido para fora) ---
type ErrorModalProps = {
    message: string;
    onClose?: () => void;
};

const ErrorModal = ({ message, onClose }: ErrorModalProps) => (
    <div className="px-2 fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-xl shadow-lg p-6 max-w-sm w-full">
            <h2 className="text-lg font-bold text-red-600 mb-2">Erro ao Publicar</h2>
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

// Página administrativa que valida, envia a capa e publica uma notícia nova.
export default function Publish() {
    const { schools, loading: schoolsLoading, fetchSchools } = useSchools(); 
    
    // Estados controlam mensagens, relógio, progresso, arquivo/preview e campos editoriais.
    const [uploadError, setUploadError] = useState("");
    const [currentDateTime, setCurrentDateTime] = useState<Date>(new Date());
    const [isLoading, setIsLoading] = useState(false);

    const [imageUpload, setImageUpload] = useState<{ file: File | null, alt: string }>({
        file: null,
        alt: ""
    });
    const [previewUrl, setPreviewUrl] = useState<string>("");

    const [formData, setFormData] = useState<NewsCreationForm>({
        title: "",
        body: "",
        school: undefined,
        author_name: "",
        status: "Rascunho",
        scheduleTo: null,
    });

    useEffect(() => {
        // Na montagem, carrega escolas e inicia o relógio; o intervalo é removido ao sair.
        const timer = setInterval(() => {
            setCurrentDateTime(new Date());
        }, 60 * 1000);

        fetchSchools();

        return () => {
            clearInterval(timer);
        }
    }, []);

    // --- LÓGICA DE SUBMISSÃO REFEITA ---

    const handleUploadImage = async (): Promise<UploadImageResponse> => {
        // O endpoint de upload recebe multipart com `file` e `alt` e deve devolver `{ id }`.
        if (!(imageUpload.file && imageUpload.alt)) {
             throw new Error("A imagem de capa e o subtítulo são obrigatórios.");
        }

        const uploadData = new FormData();
        uploadData.append("file", imageUpload.file);
        uploadData.append("alt", imageUpload.alt);

        return upload(uploadData);
    }

// Valida os dados do botao "clica", faz o uploading das imagens, cria noticiasas, trata noticia e retorna o usuario para pagina recem publicada
    const handleSubmit = async () => {
        // Valida obrigatórios, publica a imagem, compõe o payload e redireciona para o artigo criado.
        setIsLoading(true);
        setUploadError("");

        try {
            if (!formData.title || !formData.body || !imageUpload.file || !imageUpload.alt) {
                throw new Error("Preencha todos os campos obrigatórios: Título, Corpo, Imagem de Capa e Subtítulo.");
            }
        
            const coverResult = await handleUploadImage();
            const imageId = coverResult.id;
            const identifier = slug(formData.title);

            // Slug, autoria, link e ID da capa completam os campos mantidos pelo formulário.
            const updatedPayload: CreateNewsPayload = {
                ...formData,
                image: imageId,
                author_name: `${localStorage.getItem(NAME)} ${localStorage.getItem(SURNAME)}` || "",
                slug: identifier,
                link: `${HOST}radar/${identifier}`,
                status: 'Publicado',
            };
            
            const createdNews = await publishNews(updatedPayload);
            const createdSlug = typeof createdNews.slug === "string" && createdNews.slug.trim()
                ? createdNews.slug
                : identifier;

            if (previewUrl) URL.revokeObjectURL(previewUrl);
            window.location.assign(new URL(`radar/${encodeURIComponent(createdSlug)}`, HOST).toString());
        } catch (err) {
            const friendly = getFriendlyError(err);
            setUploadError(friendly);
        } finally {
            setIsLoading(false);
        }
    }

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
                {/* Formulário editorial com escola, título, capa, editor rico e botão de publicação. */}
                
                {/* --- SELETOR DE ESCOLA (NOVO) --- */}
                <div className="flex flex-wrap md:flex-nowrap justify-start gap-4">
                    <div className="my-4 w-full">
                        <label htmlFor="school" className="block text-sm font-medium text-gray-700 mb-1">
                            Selecione uma Escola (opcional)
                        </label>
                        <select
                            id="school"
                            value={formData.school ?? ""}
                            onChange={(e) => setFormData({ ...formData, school: parseInt(e.target.value) || undefined })}
                            disabled={schoolsLoading}
                            className="w-full text-red-500 font-bold text-sm rounded-md  border border-gray-300 p-2 disabled:bg-gray-100 focus:outline-none focus:border-red-200 focus:transition-all focus:duration-200 focus:ring-1 focus:ring-red-200"
                        >
                            <option value="">
                                {schoolsLoading ? "Carregando..." : "Nenhuma"}
                            </option>
                            {schools && schools.filter(school => school.group === 1 || school.group === 2)
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

                {/* --- DATA --- */}
                <div className="my-2">
                    <p className="text-xs text-gray-500">{formatarDataHora(currentDateTime)}</p>
                </div>

                {/* --- UPLOAD DE IMAGEM (REFEITO) --- */}
                <label htmlFor="file" className="w-full text-center text-sm my-6 mx-auto block">
                    <div
                        className="relative mb-2 bg-gray-200 px-6 py-4 rounded-sm my-1 min-h-[200px] h-[30vh] lg:h-[40vh] flex items-center justify-center overflow-hidden"
                        style={{
                            backgroundImage: previewUrl ? `url(${previewUrl})` : 'none',
                            backgroundPosition: 'center',
                            backgroundRepeat: 'no-repeat',
                            backgroundSize: "cover"
                        }}
                    >
                        {!previewUrl && (
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

                                // Limpa preview antigo
                                if (previewUrl) URL.revokeObjectURL(previewUrl); 
                                
                                const newPreview = URL.createObjectURL(file);
                                setPreviewUrl(newPreview);
                                setImageUpload({ ...imageUpload, file: file});
                            }}
                    />
                    <p className="text-start text-sm ">Subtítulo da capa</p>
                    <textarea
                        id="alt"
                        name="alt"
                        value={imageUpload.alt}
                        className="text-xs text-gray-600 border-b-2 border-black w-full min-h-max focus:outline-none focus:ring-1 focus:ring-white focus:border-transparent"
                        onChange={(e) => setImageUpload({ ...imageUpload, alt: e.target.value})}
                    />
                </label>

                {/* --- CORPO DA NOTÍCIA --- */}
                <div className="my-8">
                    <label htmlFor="body" className="block text-sm font-medium text-gray-700 mb-1">
                        Corpo da Notícia
                    </label>
                    <RichTextEditor
                        value={formData.body || ""}
                        onChange={(e) => {setFormData({ ...formData, body: e})}}
                        placeholder="Escreva a notícia aqui..."
                        className="min-h-[100px]"
                    />
                </div>

                {/* --- BOTÃO DE PUBLICAR --- */}
                <div className="flex flex-row-reverse w-full">
                    <button
                        onClick={handleSubmit}
                        className="w-full md:w-1/3 px-4 py-2 bg-blue-600 text-white rounded-md transition-colors self-end disabled:bg-gray-400"
                        disabled={isLoading}
                    >
                        {isLoading ? (
                            <span className="flex items-center justify-center">
                                <Spinner /> Publicando...
                            </span>
                        ) : (
                            "Publicar"
                        )}
                    </button>
                </div>
                <footer className="min-h-[2rem]"></footer>
            </main>
        </div>
    )
}
