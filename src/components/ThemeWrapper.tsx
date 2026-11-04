"use client";

import React, { createContext, useContext, useEffect, useState } from "react";

interface ThemeContextType {
  theme: "romantic-dark" | "romantic-light";
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: "romantic-dark",
  toggleTheme: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<"romantic-dark" | "romantic-light">("romantic-dark");

  useEffect(() => {
    const saved = localStorage.getItem("amelia-theme");
    if (saved === "romantic-light" || saved === "romantic-dark") {
      setTheme(saved);
      applyTheme(saved);
    } else {
      applyTheme("romantic-dark");
    }
  }, []);

  const applyTheme = (t: "romantic-dark" | "romantic-light") => {
    const root = document.documentElement;
    if (t === "romantic-dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
  };

  const toggleTheme = () => {
    const next = theme === "romantic-dark" ? "romantic-light" : "romantic-dark";
    setTheme(next);
    localStorage.setItem("amelia-theme", next);
    applyTheme(next);
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      <div className={theme === "romantic-dark" ? "dark" : ""}>{children}</div>
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
