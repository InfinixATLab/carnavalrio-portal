/** Dados cadastrais e históricos de uma escola de samba retornados pela API Carnaval. */
export interface School {
    // `cover` referencia a capa; `group` permite filtrar a divisão da escola.
    id: number;
    name: string;
    cover: number;
    subtitle: string;
    history: string;
    titles: string[];
    title_quantity: number;
    address: string;
    second_address: string;
    group: number;
}
