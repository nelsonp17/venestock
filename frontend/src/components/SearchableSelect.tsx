import React, { useState, useRef, useEffect } from "react";
import { ChevronDown, X, Search } from "lucide-react";
import { cn } from "../lib/utils";

export interface SelectOption {
    value: string;
    label: string;
}

interface SearchableSelectProps {
    options: SelectOption[];
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    disabled?: boolean;
    className?: string;
}

export function SearchableSelect({
    options,
    value,
    onChange,
    placeholder = "Seleccionar...",
    disabled = false,
    className,
}: SearchableSelectProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState("");
    const containerRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    const selectedOption = options.find((o) => o.value === value);

    const filtered = options.filter((o) =>
        o.label.toLowerCase().includes(search.toLowerCase())
    );

    // Close when clicking outside
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setIsOpen(false);
                setSearch("");
            }
        };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, []);

    // Focus search input when opening
    useEffect(() => {
        if (isOpen) {
            setTimeout(() => inputRef.current?.focus(), 0);
        }
    }, [isOpen]);

    const handleSelect = (opt: SelectOption) => {
        onChange(opt.value);
        setIsOpen(false);
        setSearch("");
    };

    const handleClear = (e: React.MouseEvent) => {
        e.stopPropagation();
        onChange("");
        setIsOpen(false);
        setSearch("");
    };

    return (
        <div ref={containerRef} className={cn("relative", className)}>
            {/* Trigger */}
            <button
                type="button"
                disabled={disabled}
                onClick={() => !disabled && setIsOpen((o) => !o)}
                className={cn(
                    "w-full flex items-center justify-between px-4 py-2 border border-border rounded-xl text-left transition-all",
                    "focus:outline-none focus:ring-2 focus:ring-primary/20",
                    disabled ? "opacity-50 cursor-not-allowed bg-secondary/40" : "bg-white hover:border-primary/40 cursor-pointer",
                    isOpen && "ring-2 ring-primary/20 border-primary/40"
                )}
            >
                <span className={cn("text-sm truncate", !selectedOption && "text-muted-foreground")}>
                    {selectedOption ? selectedOption.label : placeholder}
                </span>
                <div className="flex items-center gap-1 ml-2 shrink-0">
                    {value && !disabled && (
                        <div
                            onClick={handleClear}
                            className="p-0.5 rounded hover:bg-secondary text-muted-foreground hover:text-foreground cursor-pointer"
                        >
                            <X size={13} />
                        </div>
                    )}
                    <ChevronDown
                        size={15}
                        className={cn("text-muted-foreground transition-transform duration-200", isOpen && "rotate-180")}
                    />
                </div>
            </button>

            {/* Dropdown */}
            {isOpen && (
                <div className="absolute z-50 w-full mt-1 bg-white border border-border rounded-xl shadow-lg overflow-hidden animate-in fade-in slide-in-from-top-1 duration-150">
                    {/* Search bar */}
                    <div className="p-2 border-b border-border flex items-center gap-2">
                        <Search size={14} className="text-muted-foreground shrink-0" />
                        <input
                            ref={inputRef}
                            type="text"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Buscar..."
                            className="w-full text-sm outline-none bg-transparent placeholder:text-muted-foreground"
                        />
                    </div>

                    {/* Options */}
                    <ul className="max-h-52 overflow-y-auto">
                        {filtered.length === 0 ? (
                            <li className="px-4 py-3 text-sm text-muted-foreground text-center">
                                Sin resultados
                            </li>
                        ) : (
                            filtered.map((opt) => (
                                <li
                                    key={opt.value}
                                    onClick={() => handleSelect(opt)}
                                    className={cn(
                                        "px-4 py-2.5 text-sm cursor-pointer transition-colors",
                                        opt.value === value
                                            ? "bg-primary text-primary-foreground font-medium"
                                            : "hover:bg-secondary"
                                    )}
                                >
                                    {opt.label}
                                </li>
                            ))
                        )}
                    </ul>
                </div>
            )}
        </div>
    );
}
