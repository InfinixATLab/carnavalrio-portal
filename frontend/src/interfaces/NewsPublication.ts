/** Campos editáveis mantidos no estado dos formulários de criação e edição. */
export interface NewsCreationForm {
  title: string;
  body: string;
  school?: number;
  author_name: string;
  status: string;
  scheduleTo: Date | null;
}

/** Corpo enviado à API ao criar a notícia, já com imagem, slug e link calculados. */
export interface CreateNewsPayload extends NewsCreationForm {
  slug: string;
  image: number;
  link: string;
}

/** Resposta flexível da criação; slug e link podem ser devolvidos pelo backend. */
export interface CreateNewsResponse {
  slug?: string;
  link?: string;
  [key: string]: unknown;
}

/** Formato esperado para erros de validação por campo retornados pela API. */
export interface ApiValidationErrors {
  slug?: string | string[];
  title?: string | string[];
  body?: string | string[];
  image?: string | string[];
  detail?: string | string[];
  error?: string | string[];
  [field: string]: unknown;
}

/** Resultado mínimo esperado após o upload, usado para relacionar a imagem à notícia. */
export interface UploadImageResponse {
  id: number;
}
