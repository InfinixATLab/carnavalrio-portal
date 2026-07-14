import { useState } from "react";
import type { School } from "../../interfaces/School";
import api from "../../services/carnavalApi";

// Hook que centraliza o carregamento da lista de escolas e expõe estados de progresso e erro.
export function useSchools() {
    // `schools` recebe o vetor retornado pela API; `loading` e `error` orientam a interface.
    const [schools, setSchools] = useState<School[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    async function fetchSchools() {
        // GET schools/ espera uma lista de objetos compatíveis com a interface School.
        try {
            setLoading(true);
            setError(null);
            const {data} = await api.get('schools/');
            setSchools(data);
        } catch (error) {
            console.error("Error fetching Schools:", error);
            setError("Erro ao carregar escolas");
        } finally {
            setLoading(false);
        }
    }

    return {
        schools,
        loading,
        error,
        fetchSchools
    };
}
