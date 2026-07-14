/** Contrato do editor controlado: conteúdo atual, callback de mudança e opções visuais. */
export interface Quill {
    value: string;
    onChange: (content: string) => void;
    placeholder?: string;
    className?: string;
}
