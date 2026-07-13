export interface NewsCreationForm {
  title: string;
  body: string;
  school?: number;
  author_name: string;
  status: string;
  scheduleTo: Date | null;
}

export interface CreateNewsPayload extends NewsCreationForm {
  slug: string;
  image: number;
  link: string;
}

export interface CreateNewsResponse {
  slug?: string;
  link?: string;
  [key: string]: unknown;
}

export interface ApiValidationErrors {
  slug?: string | string[];
  title?: string | string[];
  body?: string | string[];
  image?: string | string[];
  detail?: string | string[];
  error?: string | string[];
  [field: string]: unknown;
}

export interface UploadImageResponse {
  id: number;
}
