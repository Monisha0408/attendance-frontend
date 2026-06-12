import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'

interface ThemeCtx {
  darkMode: boolean
  toggleDark: () => void
}

const ThemeContext = createContext<ThemeCtx>({ darkMode: false, toggleDark: () => {} })

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [darkMode, setDarkMode] = useState(() => {
    return localStorage.getItem('theme') === 'dark'
  })

  useEffect(() => {
    localStorage.setItem('theme', darkMode ? 'dark' : 'light')
    document.documentElement.setAttribute('data-theme', darkMode ? 'dark' : 'light')
  }, [darkMode])

  return (
    <ThemeContext.Provider value={{ darkMode, toggleDark: () => setDarkMode(v => !v) }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  return useContext(ThemeContext)
}
