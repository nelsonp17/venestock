import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number, currency: string = "BS") {
    return new Intl.NumberFormat("es-VE", {
        style: "currency",
        currency: currency === "BS" ? "VES" : "USD",
    }).format(amount);
}


/**
 * Genera un código EAN-13 válido.
 * @param prefijo Un número de 7 dígitos que identifica a tu bodega/empresa.
 * @param correlativo Un número de 5 dígitos para el producto específico.
 * @returns Un número de 13 dígitos como string (mejor para evitar pérdida de ceros).
 */
export function generateBarcode(prefijo: string, correlativo: string): string {
    const base = prefijo + correlativo; // 12 dígitos en total

    // Calcular el dígito de control (algoritmo EAN-13)
    let suma = 0;
    for (let i = 0; i < base.length; i++) {
        const digito = parseInt(base[i]);
        // Los índices pares se multiplican por 1, los impares por 3
        suma += (i % 2 === 0) ? digito : digito * 3;
    }

    const resto = suma % 10;
    const digitoControl = (resto === 0) ? 0 : 10 - resto;

    return base + digitoControl;
}