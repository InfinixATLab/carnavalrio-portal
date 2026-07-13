import { useEffect, useState } from 'react';
import Header from '../components/Header/Header';
import type { News } from '../interfaces/News';
import type { Image } from '../interfaces/Image';
import api from '../services/api';
import { useNavigate, useParams } from 'react-router-dom';
import DOMPurify from 'dompurify';
import Footer from '../components/Footer/Footer';
import { formatarDataHora } from '../tools/Tools';
import Spinner from '../components/Spinner/Spinner';

async function getArticle(slug: string): Promise<News> {
  try {
    const { data } = await api.get('news/' + slug + '/');
    return data;
  } catch (error: any) {
    console.error('Erro ao buscar a notícia: ', error);

    if (error.code === 'ECONNABORTED') {
      throw new Error('Problemas de conexão. Tente novamente mais tarde.');
    } else if (error.response) {
      throw new Error(
        `Erro ${error.response.status}: ${error.response.statusText}`
      );
    } else {
      throw new Error('Erro inesperado ao carregar as notícias.');
    }
  }
}

export default function Article() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [article, setArticle] = useState<News | null>(null);
  const [image, setImage] = useState<Image | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      if (!slug) {
        navigate('/');
        return;
      }

      try {
        setLoading(true);
        const art = await getArticle(slug);
        setArticle(art);
        setImage(art.image);
      } catch (error) {
        console.error('Erro ao carregar artigo:', error);
        setArticle(null);
      } finally {
        setLoading(false);
      }
    })();
  }, [slug, navigate]);

  // Verifica se o artigo é null após o carregamento
  useEffect(() => {
    if (!loading && article === null) {
      navigate('/');
    }
  }, [article, loading, navigate]);

  // Estado de carregamento mais claro
  if (article === undefined) {
    return <Spinner />;
  }

  // Se chegou aqui e article é null, o useEffect acima vai redirecionar
  if (article === null) {
    return null;
  }

  return (
    <>
      {article.title && (
        <>
          <Header />
          <main className="mx-4 mb-8 my-4 md:mx-auto md:max-w-[50%]">
            <div className="my-4">
              <p className="w-1/2 text-[#6e3a62ff] font-bold text-sm">
                {article.school?.name}
              </p>
            </div>
            <div>
              <h1 className="font-bold w-full min-h-max border-black">
                {article.title}
              </h1>
              <p className="text-gray-500 text-xs my-1">
                Por {article.author_name} {article.author.surname} |{' '}
                <span className="text-[10px]">
                  {formatarDataHora(article.updated_at)}
                </span>
              </p>
              <hr className="my-2" />
            </div>
            <div>
              <div
                className="mb-2 bg-gray-200 px-6 py-4 rounded-sm my-1 min-h-[200px] sm:h-[350px] flex items-center justify-center overflow-hidden"
                style={{
                  backgroundImage: `url('${image?.file}')`,
                  backgroundPosition: 'center',
                  backgroundRepeat: 'no-repeat',
                  backgroundSize: 'contain',
                  width: '100%',
                }}
              />
            </div>
            <div>
              <p className="text-gray-500 text-xs my-1">{image?.alt}</p>
            </div>
            <div className="max-w-full">
              <div
                className="text-sm leading-6 w-full my-4 break-words prose [&>p]:mb-4 [&>div]:mb-4 [&>h1]:mb-1 [&>h1>strong]:text-1xl [&>h2]:mb-1 [&>h2>strong]:text-lg [&>h3]:mb-1 [&>h3>strong]:text-md"
                dangerouslySetInnerHTML={{
                  __html: DOMPurify.sanitize(article.body),
                }}
              />
            </div>
          </main>
          <Footer />
        </>
      )}
    </>
  );
}
