export interface Quill {
    value: string;
    onChange: (content: string) => void;
    placeholder?: string;
    className?: string;
}
