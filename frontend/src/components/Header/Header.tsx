import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { FaNewspaper, FaUser } from 'react-icons/fa';
import {
  IoChevronDown,
  IoClose,
  IoLogOutOutline,
  IoMenu,
  IoPersonOutline,
} from 'react-icons/io5';
import { ACCESS_TOKEN, NAME } from '../../constants/Token';
import type { User } from '../../interfaces/User';
import api from '../../services/api';
import { FaHouse } from 'react-icons/fa6';

// Monta os cabeçalhos das requisições de usuário com o token salvo na sessão local.
const header = () => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${localStorage.getItem(ACCESS_TOKEN)}`,
});

async function fetchUser(): Promise<User> {
  // A API deve responder com os dados pessoais e os indicadores de função do usuário autenticado.
  const res = await api.get('users/me/', { headers: header() });
  return res.data;
}

interface HeaderProps {
  disabled?: boolean;
}

export default function Header({ disabled }: HeaderProps) {
  // Os estados controlam separadamente o menu de navegação, o menu da conta e os dados do usuário.
  const [isMenuOpen, setIsMenuOpen] = useState<boolean>(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState<boolean>(false);
  const [user, setUser] = useState<User>({
    name: '',
    surname: '',
    email: '',
    is_staff: false,
    is_editor: false,
    is_columnist: false,
    is_proofreader: false,
  });

  const navigate = useNavigate();
  const location = useLocation();
  const isHomeActive = location.pathname === '/';

  const handleMenu = () => {
    // Mantém somente um menu aberto por vez para evitar sobreposição.
    if (isUserMenuOpen && !isMenuOpen) setIsUserMenuOpen(false);
    setIsMenuOpen(!isMenuOpen);
  };

  async function getUser() {
    // Carrega o perfil apenas na primeira abertura; falhas de autenticação levam ao login.
    if (!user) navigate('/login');

    try {
      if (!user.email) {
        const data = await fetchUser();
        setUser(data);
      }

      if (isMenuOpen && !isUserMenuOpen) setIsMenuOpen(false);
      setIsUserMenuOpen(!isUserMenuOpen);
    } catch (error: unknown) {
      console.error('Erro ao buscar usuário:', error);
      navigate('/login');
    }
  }

  // Mantém o controle do drawer no Header e oferece fechamento pelo teclado.
  useEffect(() => {
    if (!isMenuOpen) return;

    const previousBodyOverflow = document.body.style.overflow;
    const previousDocumentOverflow = document.documentElement.style.overflow;

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsMenuOpen(false);
    };

    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.body.style.overflow = previousBodyOverflow;
      document.documentElement.style.overflow = previousDocumentOverflow;
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isMenuOpen]);

  return (
    <>
      {/* Barra principal com menu, logotipo e acesso à conta. */}
      <header className="sticky top-0 z-50 w-full border-b border-[#6e3a62]/10 bg-[#f3cb05ff] text-[#6e3a62ff] shadow-sm">
        <div
          className="mx-auto grid min-h-[72px] max-w-7xl grid-cols-[1fr_auto_1fr] items-center gap-3 px-4 py-2 sm:min-h-[82px] sm:px-6 lg:px-8"
          inert={isMenuOpen}
        >
          <button
            type="button"
            onClick={handleMenu}
            aria-label={
              isMenuOpen ? 'Fechar menu principal' : 'Abrir menu principal'
            }
            aria-expanded={isMenuOpen}
            aria-controls="main-navigation-menu"
            className="flex h-11 w-11 items-center justify-center justify-self-start rounded-full transition-colors hover:bg-[#6e3a62]/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#6e3a62] focus-visible:ring-offset-2 focus-visible:ring-offset-[#f3cb05]"
          >
            <IoMenu className="h-6 w-6" aria-hidden="true" />
          </button>

          <Link
            to="/"
            aria-label="Ir para a página inicial"
            className="col-start-2 justify-self-center rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-[#6e3a62] focus-visible:ring-offset-2 focus-visible:ring-offset-[#f3cb05]"
          >
            <img
              src="/logos/logo.webp"
              alt="Carnaval Rio"
              className="h-auto w-[170px] sm:w-[220px] lg:w-[250px]"
            />
          </Link>

          {/* Botão do usuário e painel da conta permanecem no mesmo contexto visual. */}
          <div className="relative col-start-3 justify-self-end">
            <button
              type="button"
              onClick={() => {
                !user ? navigate('/login') : getUser();
              }}
              aria-label={
                isUserMenuOpen ? 'Fechar menu da conta' : 'Abrir menu da conta'
              }
              aria-expanded={isUserMenuOpen}
              aria-controls="user-account-menu"
              className={`flex h-11 w-11 items-center justify-end gap-2 rounded-full p-0 text-[#6e3a62ff] transition-all hover:bg-white/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#6e3a62] focus-visible:ring-offset-2 focus-visible:ring-offset-[#f3cb05] disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto sm:pl-4 sm:pr-2 ${
                isUserMenuOpen ? 'bg-white/70 shadow-sm' : ''
              }`}
              disabled={disabled}
            >
              <span className="hidden max-w-40 truncate text-sm font-semibold sm:block">
                {localStorage.getItem(NAME)
                  ? `Olá, ${localStorage.getItem(NAME)}`
                  : 'Login/Registrar'}
              </span>
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/70 shadow-sm">
                <FaUser className="h-3.5 w-3.5" aria-hidden="true" />
              </span>
              <IoChevronDown
                className={`hidden h-4 w-4 shrink-0 transition-transform duration-200 sm:block ${
                  isUserMenuOpen ? 'rotate-180' : ''
                }`}
                aria-hidden="true"
              />
            </button>

            {isUserMenuOpen && !isMenuOpen && (
              <div
                id="user-account-menu"
                className="absolute right-0 top-full z-40 mt-3 w-[min(18rem,calc(100vw-2rem))] text-gray-800"
              >
                <span className="absolute -top-1.5 right-5 h-3 w-3 rotate-45 border-l border-t border-[#6e3a62]/10 bg-[#fffbe8]" />
                <div className="overflow-hidden rounded-2xl border border-[#6e3a62]/10 bg-white shadow-[0_18px_45px_-15px_rgba(63,33,56,0.35)]">
                  <div className="flex items-center gap-3 border-b border-[#6e3a62]/10 bg-gradient-to-br from-[#fff7c7] to-white px-4 py-4">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#6e3a62ff] text-white shadow-sm">
                      <FaUser className="h-4 w-4" aria-hidden="true" />
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-[#6e3a62ff]">
                        {localStorage.getItem(NAME)
                          ? `Olá, ${localStorage.getItem(NAME)}`
                          : 'Login/Registrar'}
                      </p>
                      {user.email && (
                        <p className="mt-0.5 truncate text-xs text-gray-500">
                          {user.email}
                        </p>
                      )}
                    </div>
                  </div>

                  <ul className="p-2">
                    <li>
                      <a
                        href="/me"
                        className="group flex items-center gap-3 rounded-xl px-3 py-3 transition-colors hover:bg-[#6e3a62]/5 focus:bg-[#6e3a62]/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#6e3a62]"
                      >
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-gray-600 transition-colors group-hover:bg-[#6e3a62]/10 group-hover:text-[#6e3a62ff]">
                          <IoPersonOutline aria-hidden="true" />
                        </span>
                        <span className="min-w-0">
                          <span className="block text-sm font-semibold text-gray-800">
                            Minha Conta
                          </span>
                          <span className="block text-xs text-gray-500">
                            Dados e configurações
                          </span>
                        </span>
                      </a>
                    </li>
                    {user.is_columnist && (
                      <li>
                        <a
                          href="/management/"
                          className="group flex items-center gap-3 rounded-xl px-3 py-3 transition-colors hover:bg-[#6e3a62]/5 focus:bg-[#6e3a62]/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#6e3a62]"
                        >
                          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-gray-600 transition-colors group-hover:bg-[#6e3a62]/10 group-hover:text-[#6e3a62ff]">
                            <FaNewspaper aria-hidden="true" />
                          </span>
                          <span className="min-w-0">
                            <span className="block text-sm font-semibold text-gray-800">
                              Gerenciamento
                            </span>
                            <span className="block text-xs text-gray-500">
                              Conteúdo editorial
                            </span>
                          </span>
                        </a>
                      </li>
                    )}
                    <li className="mt-1 border-t border-gray-100 pt-1">
                      <a
                        href="/logout"
                        className="group flex items-center gap-3 rounded-xl px-3 py-3 transition-colors hover:bg-red-50 focus:bg-red-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
                      >
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-red-50 text-red-600 transition-colors group-hover:bg-red-100">
                          <IoLogOutOutline className="h-5 w-5" aria-hidden="true" />
                        </span>
                        <span className="text-sm font-semibold text-red-600">
                          Sair
                        </span>
                      </a>
                    </li>
                  </ul>
                </div>
              </div>
            )}
          </div>
        </div>

      {/* Menu horizontal só em telas maiores
            <nav className="hidden lg:flex gap-6 justify-center p-2 items-center bg-gray-100 text-sm">
                <ul className="flex item-center gap-[1.25rem] flex-shrink ">
                    <a href="/">
                        <li className="hover:text-red-800 cursor-pointer whitespace-nowrap">
                            Início
                        </li>
                    </a>
                    {!schoolsLoading && schools.map((school: School) => (
                        <a key={school.id} href={`/?subject=${school.name.toLowerCase().replace(/\s+/g, '-')}`}>
                            <li className="hover:text-red-800 cursor-pointer whitespace-nowrap">
                                    {school.name}
                            </li>
                        </a>
                    ))}
                </ul>
            </nav> */}

      {/* O backdrop cobre a página e o Header, mantendo somente o drawer em destaque. */}
      {isMenuOpen && !isUserMenuOpen && (
        <button
          type="button"
          aria-label="Fechar menu principal"
          className="fixed inset-0 z-[60] cursor-default bg-black/45 backdrop-blur-[2px] motion-reduce:backdrop-blur-none"
          onClick={() => setIsMenuOpen(false)}
        />
      )}

      {/* A navegação pertence ao Header e fica fora da tela quando está fechada. */}
      <aside
        id="main-navigation-menu"
        aria-label="Menu principal"
        aria-hidden={!isMenuOpen}
        inert={!isMenuOpen}
        className={`fixed inset-y-0 left-0 z-[70] flex w-[min(88vw,320px)] flex-col overflow-hidden border-r border-[#6e3a62]/10 bg-gradient-to-b from-white via-white to-[#fffbed] shadow-[12px_0_35px_-18px_rgba(63,33,56,0.45)] transition-[transform,visibility] duration-300 ease-out after:pointer-events-none after:absolute after:bottom-0 after:left-0 after:h-1 after:w-full after:bg-[#f3cb05ff] motion-reduce:transition-none sm:w-72 ${
          isMenuOpen
            ? 'visible translate-x-0'
            : 'invisible -translate-x-full pointer-events-none'
        }`}
      >
        <div className="flex min-h-20 items-center justify-between border-b border-[#6e3a62]/10 bg-white/90 px-5 py-3 backdrop-blur-sm sm:px-6">
          <div className="min-w-0 overflow-hidden whitespace-nowrap">
            <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#6e3a62]/55">
              Navegação
            </p>
            <p className="mt-1 text-xl font-bold leading-none text-[#6e3a62ff]">
              Menu
            </p>
          </div>
          <button
            type="button"
            onClick={handleMenu}
            aria-label="Fechar menu principal"
            aria-expanded={isMenuOpen}
            aria-controls="main-navigation-links"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-500 shadow-sm transition-all hover:border-[#6e3a62]/20 hover:bg-[#6e3a62]/5 hover:text-[#6e3a62ff] active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#6e3a62] focus-visible:ring-offset-2"
          >
            <IoClose className="h-6 w-6" aria-hidden="true" />
          </button>
        </div>

        <nav
          id="main-navigation-links"
          aria-label="Navegação principal"
          className="flex-1 p-4 sm:p-5"
        >
          <a
            href="/"
            aria-current={isHomeActive ? 'page' : undefined}
            className={`group flex min-h-14 items-center gap-3 rounded-xl border px-3 py-2.5 text-sm font-bold text-[#6e3a62ff] transition-all hover:-translate-y-px hover:border-[#f3cb05]/50 hover:bg-[#f3cb05]/20 hover:shadow-sm active:translate-y-0 active:scale-[0.99] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#6e3a62] focus-visible:ring-offset-2 ${
              isHomeActive
                ? 'border-[#f3cb05]/60 bg-[#f3cb05]/20 shadow-[inset_4px_0_0_#f3cb05]'
                : 'border-gray-100 bg-white/70'
            }`}
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#f3cb05]/30 text-[#6e3a62ff] transition-colors group-hover:bg-[#f3cb05]/45">
              <FaHouse aria-hidden="true" />
            </span>
            <span className="overflow-hidden whitespace-nowrap">
              Início
            </span>
          </a>
        </nav>
        {/* <ul className="flex flex-col px-2 [&>li>a]:no-underline">
                            <hr className="mx-2"/>
                            {!sch && regions.map((region) => (
                                <a href={`/?region=${region.name.toLowerCase().replace(/\s+/g, '-')}`}>
                                    <li key={region.id} className="py-2 px-4 text-red-800 hover:bg-gray-100 cursor-pointer">
                                            {region.name}
                                    </li>
                                </a>
                            ))}
                            <hr className="mx-2"/>
                            {!subjectsLoading && subjects.map((subject) => (
                                <a href={`/?subject=${subject.name.toLowerCase().replace(/\s+/g, '-')}`}>
                                    <li key={subject.id} className="py-2 px-4 text-red-800 hover:bg-gray-100 cursor-pointer">
                                            {subject.name}
                                    </li>
                                </a>
                            ))}
                        </ul> */}
      </aside>
      </header>
    </>
  );
}
