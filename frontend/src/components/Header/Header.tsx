import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FaUser } from 'react-icons/fa';
import { IoMenu } from 'react-icons/io5';
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

  return (
    <>
      {/* Barra principal com menu, logotipo e acesso à conta. */}
      <header className="flex justify-between px-4 py-4 items-center bg-[#f3cb05ff] text-white">
        <button
          onClick={handleMenu}
          className="hover:text-gray-200 transition-colors w-full"
        >
          <IoMenu size={24} color="#6e3a62ff" />
        </button>
        <Link to="/" className="pb-2">
          <img
            src="/logos/logo.webp"
            width={500}
            className="justify-self-center"
          />
        </Link>
        {/* Botão do usuário */}
        <button
          onClick={() => {
            !user ? navigate('/login') : getUser();
          }}
          className="relative flex items-center w-full justify-end gap-2 hover:text-gray-200 transition-colors text-[#6e3a62ff]"
          disabled={disabled}
        >
          <span className="hidden sm:block text-sm">
            {localStorage.getItem(NAME)
              ? `Olá, ${localStorage.getItem(NAME)}`
              : 'Login/Registrar'}
          </span>
          <FaUser />
          {isUserMenuOpen && !isMenuOpen && (
            <div className="absolute -right-4 top-10 z-10 w-max bg-white border rounded-md shadow-lg">
              <ul className="py-1">
                <li className="text-black block sm:hidden text-sm px-6 py-3">
                  <span>
                    {localStorage.getItem(NAME)
                      ? `Olá, ${localStorage.getItem(NAME)}`
                      : 'Login/Registrar'}
                  </span>
                </li>
                <hr className="sm:hidden" />
                <li className="text-black text-sm px-6 py-3 hover:bg-gray-100 cursor-pointer">
                  <a href="/me">Minha Conta</a>
                </li>
                {user.is_columnist && (
                  <li className="text-black text-sm px-6 py-3 hover:bg-gray-100 cursor-pointer">
                    <a href="/management/">Gerenciamento</a>
                  </li>
                )}
                <li className="text-black text-sm px-6 py-3 hover:bg-gray-100 cursor-pointer">
                  <a href="/logout">Sair</a>
                </li>
              </ul>
            </div>
          )}
        </button>
      </header>

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

      {isMenuOpen && !isUserMenuOpen && (
        /* Painel de navegação exibido sobre a página quando o menu principal está aberto. */
        <div className="fixed inset-0 z-20 flex">
          {/* BACKDROP */}
          <div
            className="fixed inset-0 bg-black opacity-30"
            onClick={() => setIsMenuOpen(false)}
          />

          {/* MENU LATERAL */}
          <div className="relative w-64 h-full bg-white shadow-lg z-30">
            <div className="p-4 border-b font-semibold text-[#6e3a62ff]">
              Menu
            </div>
            <div className="py-2 px-4 text-[#6e3a62ff] hover:bg-gray-100 cursor-pointer flex items-center gap-2">
              <FaHouse />
              <a href="/" className="font-bold no-underline">
                Início
              </a>
            </div>
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
          </div>
        </div>
      )}
    </>
  );
}
