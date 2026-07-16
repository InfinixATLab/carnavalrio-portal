import { FaFacebook, FaInstagram } from 'react-icons/fa';
import { Link } from 'react-router-dom';

// Rodapé institucional compartilhado, com redes sociais, páginas legais e direitos autorais.
export default function Footer() {
  return (
    <footer className="mt-auto grid grid-cols-1 gap-y-6 overflow-x-hidden bg-[#3f2138] px-6 pb-6 pt-8 text-center text-white sm:grid-cols-[1.1fr_1fr_auto] sm:gap-x-12 sm:px-10 sm:pt-9 sm:text-left lg:gap-x-20 lg:px-16 xl:px-[max(6rem,calc((100vw-80rem)/2))]">
      {/* Faixa de identidade visual e atalhos para os perfis sociais oficiais. */}
      <div className="contents">
        <div className="contents">
          <h2 className="order-1 justify-self-center text-2xl font-bold tracking-[0.08em] text-[#f3cb05ff] sm:justify-self-start sm:pt-1">
            CARNAVALRIO
          </h2>

          <nav
            aria-label="Redes sociais"
            className="order-3 flex flex-wrap items-center justify-center gap-3 self-start sm:justify-start"
          >
            <p className="mr-1 w-full text-xs font-bold uppercase tracking-[0.16em] text-[#f3cb05ff]">
              SIGA
            </p>
            <a
              href="https://instagram.com/carnavalrio.app"
              aria-label="Instagram do Carnavalrio"
              className="flex h-10 w-10 items-center justify-center rounded-full border border-white/20 bg-white/10 text-white transition-all hover:-translate-y-0.5 hover:border-[#f3cb05]/60 hover:bg-[#f3cb05ff] hover:text-[#3f2138] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#f3cb05] focus-visible:ring-offset-2 focus-visible:ring-offset-[#3f2138]"
            >
              <FaInstagram className="h-5 w-5" aria-hidden="true" />
            </a>
            <a
              href="https://www.facebook.com/Carnavalrioapp/"
              aria-label="Facebook do Carnavalrio"
              className="flex h-10 w-10 items-center justify-center rounded-full border border-white/20 bg-white/10 text-white transition-all hover:-translate-y-0.5 hover:border-[#f3cb05]/60 hover:bg-[#f3cb05ff] hover:text-[#3f2138] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#f3cb05] focus-visible:ring-offset-2 focus-visible:ring-offset-[#3f2138]"
            >
              <FaFacebook className="h-5 w-5" aria-hidden="true" />
            </a>
          </nav>
        </div>
      </div>

      {/* Navegação secundária para informações legais e canais de contato. */}
      <nav aria-label="Links institucionais" className="order-2 self-start justify-self-center sm:justify-self-start">
        <ul className="flex flex-col items-center gap-0.5 sm:items-start">
          <li>
            <Link
              to="/privacy-policy"
              className="inline-flex min-h-11 items-center rounded-md px-2 text-xs font-medium text-white/75 transition-colors hover:text-[#f3cb05ff] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#f3cb05] sm:min-h-8 sm:px-0"
            >
              POLÍTICA DE PRIVACIDADE
            </Link>
          </li>
          <li>
            <Link
              to="/terms"
              className="inline-flex min-h-11 items-center rounded-md px-2 text-xs font-medium text-white/75 transition-colors hover:text-[#f3cb05ff] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#f3cb05] sm:min-h-8 sm:px-0"
            >
              TERMOS E CONDIÇÕES
            </Link>
          </li>
          <li>
            <Link
              to="/contact"
              className="inline-flex min-h-11 items-center rounded-md px-2 text-xs font-medium text-white/75 transition-colors hover:text-[#f3cb05ff] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#f3cb05] sm:min-h-8 sm:px-0"
            >
              FALE CONOSCO
            </Link>
          </li>
          <li>
            <Link
              to="/advertise"
              className="inline-flex min-h-11 items-center rounded-md px-2 text-xs font-medium text-white/75 transition-colors hover:text-[#f3cb05ff] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#f3cb05] sm:min-h-8 sm:px-0"
            >
              ANUNCIE
            </Link>
          </li>
        </ul>
      </nav>

      <div className="order-4 col-span-full -mx-6 mt-1 border-t border-white/10 px-6 py-4 sm:-mx-10 sm:px-10 lg:-mx-16 lg:px-16 xl:-mx-[max(6rem,calc((100vw-80rem)/2))] xl:px-[max(6rem,calc((100vw-80rem)/2))]">
        <p className="mx-auto max-w-5xl text-center text-[10px] leading-5 text-white/55">
          &copy; 2020 - 2025. Todos direitos reservados a Carnavalrio.app . Este material não pode ser publicado, transmitido por broadcast, reescrito ou redistribuido sem autorização.
        </p>
      </div>
    </footer>
  );
}
