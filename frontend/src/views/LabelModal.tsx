import { useRef, useEffect } from "react";
import bwipjs from "bwip-js";
import { X, Printer } from "lucide-react";
import { formatCurrency } from "../lib/utils";
import { Producto } from "../types";
import { useReactToPrint } from 'react-to-print';

interface LabelModalProps {
    isOpen: boolean;
    onClose: () => void;
    products: Producto[];
}

export function LabelModal({ isOpen, onClose, products }: LabelModalProps) {
    const containerRef = useRef<HTMLDivElement>(null);

    // Hook de impresión definido al principio
    const handlePrint = useReactToPrint({
        contentRef: containerRef,
        documentTitle: "Etiquetas_VeneStock",
        pageStyle: `
            @page {
                size: auto;
                margin: 10mm;
            }
            @media print {
                body { 
                    margin: 0; 
                    -webkit-print-color-adjust: exact; 
                }
                .no-print {
                    display: none !important;
                }
                .printable-label {
                    break-inside: avoid;
                    page-break-inside: avoid;
                }
            }
        `,
    });

    useEffect(() => {
        if (isOpen && products.length > 0 && containerRef.current) {
            // Esperar un pequeño frame para asegurar que el DOM está listo
            const timer = setTimeout(() => {
                const canvases = document.querySelectorAll('.qr-canvas-temp');
                canvases.forEach(canvas => {
                    const htmlCanvas = canvas as HTMLCanvasElement;
                    const productId = htmlCanvas.getAttribute('data-product-id');
                    const product = products.find(p => String(p.id) === productId);
                    
                    if (product && product.barras) {
                        try {
                            bwipjs.toCanvas(htmlCanvas, {
                                bcid: "qrcode",
                                text: product.barras,
                                scale: 3,
                                height: 15,
                                width: 15,
                                includetext: false,
                            });
                            
                            // Convertir canvas a imagen para que persista en la impresión
                            const img = document.getElementById(`qr-img-${product.id}`) as HTMLImageElement;
                            if (img) {
                                img.src = htmlCanvas.toDataURL("image/png");
                            }
                        } catch (e) {
                            console.error("Error generating QR:", e);
                        }
                    }
                });
            }, 100);
            return () => clearTimeout(timer);
        }
    }, [isOpen, products]);

    if (!isOpen || products.length === 0) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 no-print">
            <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200 flex flex-col max-h-[90vh]">
                <div className="flex justify-between items-center p-6 border-b border-border">
                    <h3 className="text-xl font-bold">Imprimir Etiquetas QR ({products.length})</h3>
                    <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
                        <X size={24} />
                    </button>
                </div>

                {/* Contenedor que será impreso */}
                <div className="p-8 overflow-y-auto flex-1 bg-secondary/5" ref={containerRef}>
                    <div id="printable-area" className="grid grid-cols-2 md:grid-cols-3 gap-6 print:grid-cols-3 print:gap-4">
                        {products.map((product) => (
                            <div
                                key={product.id}
                                className="printable-label border border-dashed border-border p-4 rounded-xl bg-white flex flex-col items-center space-y-3 shadow-sm print:shadow-none print:border print:border-solid print:m-2 print:break-inside-avoid"
                            >
                                <h4 className="text-sm font-bold text-center truncate w-full">{product.nombre}</h4>
                                
                                <div className="bg-white p-2 rounded-lg border border-border/50">
                                    {/* Canvas oculto usado solo para generar el DataURL */}
                                    <canvas 
                                        data-product-id={product.id} 
                                        className="qr-canvas-temp hidden"
                                    ></canvas>
                                    {/* Imagen que sí se verá en la impresión */}
                                    <img 
                                        id={`qr-img-${product.id}`} 
                                        className="mx-auto w-32 h-32 object-contain" 
                                        alt="QR Code"
                                    />
                                </div>
                                
                                <div className="flex justify-center w-full font-black text-lg text-primary">
                                    {formatCurrency(product.precio_ref_usd, "USD")}
                                </div>
                                <p className="text-[8px] text-muted-foreground font-mono">{product.codigo}</p>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="p-6 bg-white border-t border-border flex justify-end space-x-3 no-print">
                    <button
                        onClick={onClose}
                        className="px-6 py-2 border border-border text-muted-foreground hover:bg-secondary rounded-xl transition-colors font-semibold"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={() => handlePrint()}
                        className="px-6 py-2 bg-primary text-primary-foreground hover:opacity-90 rounded-xl transition-all shadow-md flex items-center space-x-2 font-bold"
                    >
                        <Printer size={18} />
                        <span>Imprimir Todo</span>
                    </button>
                </div>
            </div>
        </div>
    );
}
