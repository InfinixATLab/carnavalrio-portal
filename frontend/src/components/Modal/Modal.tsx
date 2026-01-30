import React, { useEffect, useRef, useState } from "react";

type ModalProps = {
    isOpen: boolean;
    onClose: () => void;
    modalTitle?: string;
    children: React.ReactNode;
};

export default function Modal({ isOpen, onClose, modalTitle, children }: ModalProps) {
    const overlayRef = useRef<HTMLDivElement>(null);
    const contentRef = useRef<HTMLDivElement>(null);
    const [show, setShow] = useState(false);
    const [animate, setAnimate] = useState(false);

    // Controla montagem/desmontagem
    useEffect(() => {
        if (isOpen) {
            setShow(true);
            setTimeout(() => setAnimate(true), 10);
        } else {
            setAnimate(false);
            const timeout = setTimeout(() => setShow(false), 300);
            return () => clearTimeout(timeout);
        }
    }, [isOpen]);

    // Fechar ao pressionar ESC
    useEffect(() => {
        function handleKeyDown(e: KeyboardEvent) {
            if (e.key === "Escape" && isOpen) onClose();
        }
        document.addEventListener("keydown", handleKeyDown);
        return () => document.removeEventListener("keydown", handleKeyDown);
    }, [isOpen, onClose]);

    if (!show) return null;

    return (
        <div className="fixed inset-0 z-50 flex justify-center items-start md:pt-20">
            <div
                ref={overlayRef}
                className={`absolute inset-0 bg-black transition-opacity duration-300 ${animate ? "opacity-75" : "opacity-0"}`}
                style={{ zIndex: 40 }}
                onClick={onClose}
            />

            {/* Content */}
            <div
                ref={contentRef}
                className={`
                    relative w-full h-full md:w-[60%] lg:w-[40%] md:h-min bg-white border border-gray-300 rounded-md
                    flex flex-col px-6
                    transition-all duration-300
                    ${animate ? "translate-y-0 opacity-100" : "-translate-y-10 opacity-0"}
                `}
                style={{ zIndex: 50 }}
            >
                {/* Modal Header */}
                <div className={`flex items-center p-4 ${modalTitle ? "justify-between" : "justify-end"}`}>
                    {/* Modal Title */}
                    {modalTitle && <h2 className="text-lg font-semibold">{modalTitle}</h2>}
                    {/* Close Button */}
                    <button
                        className="text-3xl text-gray-400 hover:text-gray-800 self-end"
                        onClick={onClose}
                    >
                        &times;
                    </button>
                </div>

                {/* Modal Body */}
                <div className="p-4 flex justify-center items-center h-auto">
                    {children}
                </div>
            </div>
        </div>
    );
}
