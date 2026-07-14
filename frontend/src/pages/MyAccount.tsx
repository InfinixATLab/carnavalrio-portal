import { FaUser } from "react-icons/fa";
import { ImExit } from "react-icons/im";
import { MdEmail, MdPassword } from "react-icons/md";
import { BiSolidUser } from 'react-icons/bi';
import { IoIosArrowForward } from "react-icons/io";
import { ACCESS_TOKEN, NAME } from "../constants/Token";
import React, { useState } from "react";
import Modal from "../components/Modal/Modal";
import { Link } from "react-router-dom";
import type { User } from "../interfaces/User";
import api from "../services/api";

const headers = () => ({
    'Authorization': `Bearer ${localStorage.getItem(ACCESS_TOKEN)}`
})

// Obtém o identificador necessário para montar os endpoints de atualização do perfil.
async function fetchUser(): Promise<string> {
    const res = await api.get("users/me/", { headers: headers() });
    return res.data.id;
}

async function updateField(payload: {}, user_id: string, password: boolean): Promise<User> {
    // Senhas usam uma ação específica; nome e e-mail usam a atualização parcial do usuário.
    const url = password ? `users/${user_id}/change-password/` : `users/${user_id}/`

    try{
        const res = await api.patch(url, payload, {
            headers: headers()
        })

        return res.data;
    }catch(error: any){
        console.error("Erro ao atualizar usuário: ", error)

        if (error.code === "ECONNABORTED") {
            throw new Error("Problemas de conexão. Tente novamente mais tarde.")
        } else if (error.response) {
            throw new Error(`Erro ${error.response.status}: ${error.response.statusText}`);
        } else {
            throw new Error("Erro inesperado ao carregar as notícias.");
        }
    }
}

type FieldType = "name" | "email" | "password";

const FIELD_LABELS: Record<FieldType, string> = {
    name: 'Nome',
    email: 'Email',
    password: 'Senha',
}

export default function MyAccount() {
    // O modal edita um campo por vez; `formValues` preserva os valores digitados por categoria.
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [fieldType, setFieldType] = useState<FieldType | null>(null);
    const [userId, setUserId] = useState<string>("");
    const [formValues, setFormValues] = useState<Record<FieldType, string>>({
        name: "",
        password: "",
        email: "",
    })

    const openModal = (type: FieldType) => {
        setFieldType(type);
        setIsModalOpen(true);
    }
    
    const closeModal = () => {
        setIsModalOpen(false);
        setFieldType(null);
    }
    
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const {value} = e.target;
        if (fieldType) {
            setFormValues((prev) => ({
                ...prev,
                [fieldType]: value,
            }));
        }
    }

    const getUser = async () => {
        const data = await fetchUser()
        setUserId(data);
    }

    const handleSubmit = async () => {
        // Ignora valores vazios, envia apenas o campo selecionado e atualiza o nome local quando necessário.
        getUser();

        if (!fieldType) return;
        
        const value = formValues[fieldType].trim();
        if (!value) return;

        const payload = { [fieldType]: value };

        await updateField(payload, userId, fieldType === "password");

        if (fieldType === "name") localStorage.setItem(NAME, value);

        setUserId("");
        closeModal();
    }

    const userName = localStorage.getItem(NAME);

    return (
        <>
            {/* Resumo da conta e menu das configurações disponíveis. */}
            <div className="h-screen md:h-min md:border md:border-gray-300 md:rounded-lg md:max-w-[60%] lg:max-w-[40%] mx-auto md:mt-20">
                <div className="text-center py-8 bg-gradient-to-b from-red-800 to-red-950 overflow-hidden md:rounded-t-lg">
                    <div className="rounded-full bg-white max-w-max max-h-max mx-auto p-4">
                        <FaUser size={48}/>
                    </div>
                    <p className="mt-2 text-white font-bold">Olá, {userName}</p>
                </div>
                <div className="p-4">
                    <ul className="flex flex-col [&>li]:cursor-pointer">
                        <SettingItem icon={<BiSolidUser />} label="Alterar nome" onClick={() => openModal("name")} />
                        <SettingItem icon={<MdEmail />} label="Alterar e-mail" onClick={() => openModal("email")} />
                        <SettingItem icon={<MdPassword />} label="Alterar senha" onClick={() => openModal("password")} />
                        <Link to="/Logout">
                            <SettingItem icon={<ImExit />} label="Sair" />
                        </Link>
                    </ul>
                </div>
            </div>

            {isModalOpen && fieldType && (
                /* O modal adapta rótulo e tipo do campo à configuração escolhida. */
                <Modal modalTitle="Configurações da Conta"
                    isOpen={isModalOpen}
                    onClose={closeModal}
                >
                    <div className="text-start w-full h-full">
                        <p className="pb-4">Altere seu {FIELD_LABELS[fieldType].toLowerCase()}</p>
                        <div className="mb-8">
                            <label htmlFor={fieldType}className="block text-sm font-bold text-gray-700 mb-1">
                                Novo {FIELD_LABELS[fieldType]}
                            </label>
                            <input
                                id={fieldType}
                                type={fieldType === "password" ? "password" : "text"}
                                value={formValues[fieldType]}
                                onChange={handleChange}
                                placeholder={`Novo ${FIELD_LABELS[fieldType].toLowerCase()}`}
                                required
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                            <div className="flex">
                                <button
                                onClick={handleSubmit}
                                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md transition-colors my-2"
                                >
                                    Salvar
                                </button>
                            </div>
                        </div>
                    </div>
                </Modal>
            )}
        </>
    );
}

type SettingItemProps = {
  icon: React.ReactNode;
  label: string;
  onClick?: () => void;
};

// Item visual reutilizado pelas ações da lista de configurações.
function SettingItem({ icon, label, onClick }: SettingItemProps) {
  return (
    <li
      className="border-b p-4 flex justify-between items-center gap-3 hover:bg-gray-100"
      onClick={onClick}
    >
      <div className="flex-0">{icon}</div>
      <div className="flex-1 text-start">{label}</div>
      <div className="flex-0 self-end">
        <IoIosArrowForward color="gray" />
      </div>
    </li>
  );
}
