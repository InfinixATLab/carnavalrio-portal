// Spinner como um overlay fixo na tela inteira
export default function Spinner() {
    return (
        <div 
            className="
                fixed inset-0 z-50  /* Posicionamento fixo, cobrindo a tela (top/right/bottom/left: 0) com z-index alto */
                flex items-center justify-center /* Centralização via flexbox */
                bg-white bg-opacity-75  /* Fundo branco com leve transparência para ver o conteúdo por baixo */
                backdrop-blur-sm      /* Efeito de desfoque sutil no conteúdo atrás do spinner (opcional) */
            "
            aria-label="Carregando conteúdo"
            role="status"
        >
            <div 
                className="w-16 h-16 border-2 border-red-600 border-t-transparent rounded-full animate-spin"
            />
        </div>
    );
}
