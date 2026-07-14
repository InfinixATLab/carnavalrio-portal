import type React from "react"
import type { User } from "../interfaces/User";
import api from "../services/api";
import { useState } from "react";
import { FaRegEye, FaRegEyeSlash } from "react-icons/fa";
import { useNavigate } from "react-router-dom";

const headers = () => ({
    "Content-Type": "application/json",
})

// Cria o usuário; o endpoint recebe os campos do formulário em JSON.
async function registerUser(payload: {}): Promise<User[]> {
    const res = await api.post("/users/", payload, { headers: headers() })
    return res.data
}

interface LoginForm {
    email: string;
    name: string;
    surname: string;
    password: string;
}

export default function Register() {
    // Mantém os quatro campos controlados, a exibição da senha e uma mensagem de falha.
    const [showPassword, setShowPassword] = useState<boolean>(false);
    const [error, setError] = useState<String>("");
    const navigate = useNavigate();

    const changePasswordVisibility = () => {
        setShowPassword(!showPassword);
    }

    const [formData, setFormData] = useState<LoginForm>({
        email: "",
        name: "",
        surname: "",
        password: ""
    })

    const register = async (e: React.FormEvent) => {
        // O navegador valida os campos `required`; sucesso redireciona ao login com aviso na URL.
        e.preventDefault();
        
        try {
            await registerUser(formData);
            navigate("/login?s=true");
        } catch (err) {
            setError("E-mail já cadastrado.");
        }
    }

    return (
        <main className="h-full w-full px-8 py-12">
            {/* Formulário de cadastro e atalho para usuários que já possuem conta. */}
            <h1 className="mx-auto text-center max-w-max font-bold text-2xl">Bem-Vindo!</h1>
            <form onSubmit={register} className="m-auto sm:max-w-[80%] md:max-w-[50%] lg:max-w-[30%] grid grid-cols-1 gap-4 mt-8">
                {error && (
                    <div className="w-full mt-2">
                        <p className="text-red-500 text-sm text-center">{error}</p>
                    </div>
                )}
                <div>
                    <label htmlFor="email" className="block text-sm font-bold text-gray-700 mb-1">
                        Email
                    </label>
                    <input
                        id="email"
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        placeholder="seu@email.com"
                        required
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                </div>
                <div>
                    <label htmlFor="name" className="block text-sm font-bold text-gray-700 mb-1">
                        Primeiro Nome
                    </label>
                    <input
                        id="name"
                        type="text"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="Gustavo"
                        required
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                </div>
                <div>
                    <label htmlFor="surname" className="block text-sm font-bold text-gray-700 mb-1">
                        Sobrenome
                    </label>
                    <input
                        id="surname"
                        type="text"
                        value={formData.surname}
                        onChange={(e) => setFormData({ ...formData, surname: e.target.value })}
                        placeholder="Grey Oliveira"
                        required
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                </div>
                <div>
                    <label htmlFor="password" className="block text-sm font-bold text-gray-700 mb-1">
                        Senha
                    </label>
                    <div className="w-full flex">
                        <input
                            id="password"
                            type={showPassword ? "text" : "password"}
                            value={formData.password}
                            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                            placeholder="Sua senha"
                            required
                            className="w-full px-3 py-2 border border-gray-300 rounded-l-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                        <button
                            type="button"
                            onClick={changePasswordVisibility}
                            className="border rounded-r-lg px-4"
                        >
                            {!showPassword ? (
                                <FaRegEye />
                            ) : (
                                <FaRegEyeSlash />
                            )}
                        </button>
                    </div>
                </div>
                <div className="flex flex-col">
                    <button
                        type="submit"
                        className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md transition-colors my-2"
                    >
                        Continuar
                    </button>
                </div>
                <div className="text-center my-8">
                    <p className="text-gray-500 text-sm">Já possui uma conta?</p>
                    <a href="/login" className="text-red-600 font-bold text-sm underline">Faça login agora!</a>
                </div>
            </form>
        </main>
    )
}
