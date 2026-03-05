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
