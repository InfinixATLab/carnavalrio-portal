import { useState } from "react";
import type { School } from "../../interfaces/School";
import api from "../../services/carnavalApi";

export function useSchools() {
    const [schools, setSchools] = useState<School[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    async function fetchSchools() {
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
