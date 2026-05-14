import { createContext, useContext, useState, useEffect, useCallback } from 'react'

/**
 * Contexto de accesibilidad — persiste en localStorage.
 * Controla: tamaño de texto, contraste alto, reducción de movimiento, asistente de voz.
 */
const AccessibilityContext = createContext(null)

const DEFAULTS = {
  fontSize: 0,          // -2, -1, 0, 1, 2
  highContrast: false,
  reducedMotion: false,
  voiceAssistant: false,
}

export function AccessibilityProvider({ children }) {
  const [prefs, setPrefs] = useState(() => {
    try {
      const saved = localStorage.getItem('accessibility_prefs')
      return saved ? { ...DEFAULTS, ...JSON.parse(saved) } : DEFAULTS
    } catch { return DEFAULTS }
  })

  // Persistir cambios
  useEffect(() => {
    localStorage.setItem('accessibility_prefs', JSON.stringify(prefs))
  }, [prefs])

  // Aplicar clases al <html>
  useEffect(() => {
    const html = document.documentElement

    // Tamaño de texto
    const sizes = { '-2': '14px', '-1': '15px', '0': '', '1': '17px', '2': '19px' }
    html.style.fontSize = sizes[String(prefs.fontSize)] || ''

    // Contraste alto
    html.classList.toggle('high-contrast', prefs.highContrast)

    // Reducción de movimiento
    html.classList.toggle('reduce-motion', prefs.reducedMotion)
  }, [prefs])

  // ── Asistente de voz (SpeechSynthesis) ──────────────────────────────────
  const speak = useCallback((text) => {
    if (!prefs.voiceAssistant) return
    if (!window.speechSynthesis) return

    // Cancelar cualquier lectura anterior
    window.speechSynthesis.cancel()

    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = 'es-ES'
    utterance.rate = 1.1
    utterance.pitch = 1
    utterance.volume = 0.8
    window.speechSynthesis.speak(utterance)
  }, [prefs.voiceAssistant])

  // ── Asistente de voz GLOBAL ──────────────────────────────────────────────
  // Listener que detecta focus y hover en elementos interactivos de toda la app
  useEffect(() => {
    if (!prefs.voiceAssistant) return

    let lastSpoken = ''
    let timeout = null

    const getLabel = (el) => {
      // Prioridad: aria-label > title > aria-describedby > placeholder > textContent corto
      if (el.getAttribute('aria-label')) return el.getAttribute('aria-label')
      if (el.title) return el.title
      if (el.placeholder) return el.placeholder

      // Para botones e inputs, leer texto visible
      const text = el.textContent?.trim()
      if (text && text.length < 60) return text

      // Para inputs, leer el label asociado
      if (el.id) {
        const label = document.querySelector(`label[for="${el.id}"]`)
        if (label) return label.textContent?.trim()
      }

      return ''
    }

    const handleEvent = (e) => {
      const el = e.target.closest('button, a, input, select, textarea, [role="button"], [tabindex]')
      if (!el) return

      const label = getLabel(el)
      if (!label || label === lastSpoken) return

      // Debounce para evitar repeticiones rápidas
      clearTimeout(timeout)
      timeout = setTimeout(() => {
        lastSpoken = label
        speak(label)
        // Reset después de 2s para permitir re-lectura
        setTimeout(() => { lastSpoken = '' }, 2000)
      }, 150)
    }

    // Escuchar focus (teclado) y mouseenter (mouse) en toda la app
    document.addEventListener('focusin', handleEvent, true)
    document.addEventListener('mouseenter', handleEvent, true)

    return () => {
      document.removeEventListener('focusin', handleEvent, true)
      document.removeEventListener('mouseenter', handleEvent, true)
      clearTimeout(timeout)
    }
  }, [prefs.voiceAssistant, speak])

  const update = (key, value) => setPrefs(p => ({ ...p, [key]: value }))
  const reset = () => {
    if (window.speechSynthesis) window.speechSynthesis.cancel()
    setPrefs(DEFAULTS)
  }

  return (
    <AccessibilityContext.Provider value={{ prefs, update, reset, speak }}>
      {children}
    </AccessibilityContext.Provider>
  )
}

export const useAccessibility = () => useContext(AccessibilityContext)
