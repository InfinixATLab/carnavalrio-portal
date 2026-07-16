import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.tsx';
import { ApolloProvider } from '@apollo/client/react';

import { ApolloClient, HttpLink, InMemoryCache } from '@apollo/client';
import { API_HOST } from './constants/Host.ts';

// Cliente GraphQL compartilhado: envia consultas ao backend e mantém os resultados em memória.
const client = new ApolloClient({
  link: new HttpLink({ uri: `${API_HOST}g/graph` }),
  cache: new InMemoryCache(),
});

// Monta a aplicação e disponibiliza o cliente Apollo para todas as páginas descendentes.
createRoot(document.getElementById('root')!).render(
  <ApolloProvider client={client}>
    <StrictMode>
      <App />
    </StrictMode>
  </ApolloProvider>
);
