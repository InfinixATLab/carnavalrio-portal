import type React from "react"
import api from "../services/api";
import { useEffect, useState } from "react";
import { FaRegEye, FaRegEyeSlash } from "react-icons/fa";
import { useLocation, useNavigate } from "react-router-dom";
import { ACCESS_TOKEN, EMAIL, NAME, REFRESH_TOKEN, SURNAME } from "../constants/Token";
import type { Token } from "../interfaces/Token";

async function loginUser(payload: {}): Promise<Token> {
    const {data} = await api.post('token/', payload)
    return data
}

interface LoginForm {
    email: string;
    password: string;
}

export default function Login() {
    const navigate = useNavigate();
    const location = useLocation();
    const queryParams = new URLSearchParams(location.search);

    const [showPassword, setShowPassword] = useState<boolean>(false);
    const success = queryParams.get('s'); 
    const [error, setError] = useState<String>("");

    useEffect(() => {
        const verifyLoggedUser = async () => {
            const verifier = localStorage.getItem("auth");
            if (verifier === "true") navigate("/");
        }

        verifyLoggedUser();
    }, [navigate]);

    const changePasswordVisibility = () => {
        setShowPassword(!showPassword);
    }

    const [formData, setFormData] = useState<LoginForm>({
        email: "",
        password: ""
    })

    const login = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData || !(formData.email && formData.password)) {
            setError("E-mail e Senha devem ser preenchidos!")
            return;
        }
        
        try {
            const res = await loginUser(formData);
            localStorage.setItem(ACCESS_TOKEN, res.access);
            localStorage.setItem(REFRESH_TOKEN, res.refresh);
            localStorage.setItem(EMAIL, res.email);
            localStorage.setItem(NAME, res.name);
            localStorage.setItem(SURNAME, res.surname);
            navigate("/");
        } catch (err: unknown) {
            setError("Verifique seu e-mail e senha!");
        }
    }

    return (
        <main className="h-full w-full px-8 py-12">
            <h1 className="mx-auto text-center max-w-max font-bold text-2xl">Bem-Vindo!</h1>
            <form onSubmit={login} className="m-auto sm:max-w-[80%] md:max-w-[50%] lg:max-w-[30%] grid grid-cols-1 gap-4 mt-8">
                {error && (
                    <div className="w-full mt-2">
                        <p className="text-red-500 text-sm text-center">{error}</p>
                    </div>
                )}
                {success && (
                    <div className="w-full mt-2">
                        <p className="text-green-600 text-sm text-center">Conta criada! Faça login!</p>
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
                            onClick={changePasswordVisibility}
                            type="button"
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
                        className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md transition-colors"
                    >
                        Continuar
                    </button>
                </div>
                <div className="text-center my-8">
                    <p className="text-gray-500 text-sm">Ainda não possui uma conta?</p>
                    <a href="/register" className="text-red-600 font-bold text-sm underline">Crie uma conta gratuitamente!</a>
                </div>
            </form>
        </main>
    )
}
