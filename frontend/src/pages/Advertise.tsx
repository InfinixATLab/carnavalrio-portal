import { FaGear } from "react-icons/fa6";
import Footer from "../components/Footer/Footer";
import Header from "../components/Header/Header";

// Página institucional temporária para a futura área de propostas comerciais e publicidade.
export default function Advertise() {
    return (
        <>
            <Header />
                {/* Aviso visual de manutenção apresentado no lugar do conteúdo comercial. */}
                <div className="container md:max-w-[60%] xl:max-w-[50%] mx-auto px-4 py-8">
                    <h1 className="text-2xl text-center font-bold mb-4">Anuncie</h1>
                    <p className="text-center">Em manutenção! Por favor, tente novamente mais tarde!</p>
                    <div className="my-8' relative flex justify-center">
                        <FaGear size={82} className="m-0 my-8 animate-spin"/>
                        <FaGear size={41} className="animate-spin-reverse right-[7rem] top-16"/>
                    </div>
                </div>
            <Footer />
        </>
    );
}
