import { FaFacebook, FaInstagram } from "react-icons/fa";
import { Link } from "react-router-dom";

// Rodapé institucional compartilhado, com redes sociais, páginas legais e direitos autorais.
export default function Footer() {
    return (
        <footer className="text-center">
            {/* Faixa de identidade visual e atalhos para os perfis sociais oficiais. */}
            <div className="bg-[#f3cb05ff] text-[#6e3a62ff]">
                <div className=" px-2 py-4 md:flex items-center md:justify-between md:mx-auto md:max-w-[80%] lg:max-w-[50%]">
                    <h1 className="font-bold">CARNAVALRIO</h1>
                    <div className="flex flex-row gap-[10px] my-2 items-center justify-center">
                        <p className="text-sm">SIGA</p>
                        <a href="https://instagram.com/carnavalrio.app" className="w-[1.2rem] h-[1.2rem]">
                            <FaInstagram className="w-full h-full" />
                        </a>
                        <a href="https://www.facebook.com/Carnavalrioapp/" className="w-[1.2rem] h-[1.2rem]">
                            <FaFacebook className="w-full h-full" />
                        </a>
                    </div>
                </div>
            </div>
            {/* Navegação secundária para informações legais e canais de contato. */}
            <div className="underline flex flex-col gap-[20px] py-6 px-2 mx-auto border-t border-grey-500 md:flex-row md:justify-center">
                <Link to="/privacy-policy" className="text-xs">POLÍTICA DE PRIVACIDADE</Link>
                <Link to="/terms" className="text-xs">TERMOS E CONDIÇÕES</Link>
                <Link to="/contact" className="text-xs">FALE CONOSCO</Link>
                <Link to="/advertise" className="text-xs">ANUNCIE</Link>
            </div>
            <p className="text-xs border-t border-black px-2 text-center py-4">
                &copy; 2020 - 2025. Todos direitos reservados a Carnavalrio.app . Este material não pode ser publicado, transmitido por broadcast, reescrito ou redistribuido sem autorização.
            </p>
        </footer>
    )
}
