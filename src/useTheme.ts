import { useEffect, useState } from 'react'

type Theme = 'light' | 'dark'

function getSystemTheme(): Theme {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(getSystemTheme)

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    // Keep the installed-PWA status bar in step with the applied theme. The meta
    // is seeded in index.html for first paint; from here on this owns it. Values
    // mirror --bg in :root / :root[data-theme='dark'].
    const meta = document.querySelector('meta[name="theme-color"]')
    if (meta) meta.setAttribute('content', theme === 'dark' ? '#1a1a1a' : '#f4f4f6')
  }, [theme])

  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const onChange = () => setTheme(media.matches ? 'dark' : 'light')
    media.addEventListener('change', onChange)
    return () => media.removeEventListener('change', onChange)
  }, [])

  return { theme }
}
