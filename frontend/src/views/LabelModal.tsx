import { useRef, useEffect } from "react";
import bwipjs from "bwip-js";
import { X, Printer } from "lucide-react";
import { formatCurrency } from "../lib/utils";
import { Producto } from "../types";

interface LabelModalProps {
    isOpen: boolean;
    onClose: () => void;
    product: Producto | null;
}

export function LabelModal({ isOpen, onClose, product }: LabelModalProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        if (isOpen && product && product.barras && canvasRef.current) {
            try {
                const barcodeValue = product.barras;
                const bcid = barcodeValue.length === 12 || barcodeValue.length === 13 ? "ean13" : "code128";

                bwipjs.toCanvas(canvasRef.current, {
                    bcid: bcid,
                    text: barcodeValue,
                    scale: 3,
                    height: 10,
                    includetext: true,
                    textxalign: "center",
                });
            } catch (e) {
                console.error("Error generating barcode:", e);
            }
        }
    }, [isOpen, product]);

    if (!isOpen || !product) return null;

    const handlePrint = () => {
        window.print();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 no-print">
            <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
                <div className="flex justify-between items-center p-6 border-b border-border">
                    <h3 className="text-xl font-bold">Imprimir Etiqueta</h3>
                    <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
                        <X size={24} />
                    </button>
                </div>

                <div className="p-8 flex flex-col items-center">
                    <div id="printable-label" className="border border-dashed border-border p-6 rounded-lg bg-gray-50 flex flex-col items-center space-y-4 print:border-none print:bg-white print:p-0">
                        <h4 className="text-lg font-bold text-center underline truncate max-w-[250px]">{product.nombre}</h4>

                        <div className="flex flex-col items-center">
                            <canvas ref={canvasRef}></canvas>
                        </div>

                        <div className="flex justify-between w-full font-bold text-xl px-4">
                            <span className="text-primary">{formatCurrency(product.precio_ref_usd, "USD")}</span>
                            {/* <span className="text-foreground">{formatCurrency(product.precio_bs, "BS")}</span> */}
                        </div>
                        {/* <p className="text-[10px] text-muted-foreground">SGM VeneStock - {new Date().toLocaleDateString()}</p> */}
                    </div>
                </div>

                <div className="p-6 bg-secondary/10 flex justify-end space-x-3">
                    <button
                        onClick={onClose}
                        className="px-6 py-2 border border-border text-muted-foreground hover:bg-secondary rounded-xl transition-colors"
                    >
                        Cerrar
                    </button>
                    <button
                        onClick={handlePrint}
                        className="px-6 py-2 bg-primary text-primary-foreground hover:opacity-90 rounded-xl transition-all shadow-md flex items-center space-x-2"
                    >
                        <Printer size={18} />
                        <span>Imprimir</span>
                    </button>
                </div>
            </div>

            <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #printable-label, #printable-label * {
            visibility: visible;
          }
          #printable-label {
            position: absolute;
            left: 50%;
            top: 20%;
            transform: translate(-50%, -50%);
            width: 80mm;
            height: 50mm;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>
        </div>
    );
}
