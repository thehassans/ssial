import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { apiGet } from '../api'

const COUNTRY_TO_CURRENCY = {
  'SA': 'SAR', 'AE': 'AED', 'OM': 'OMR', 'BH': 'BHD', 'KW': 'KWD', 'QA': 'QAR',
  'IN': 'INR', 'PK': 'PKR', 'JO': 'JOD', 'US': 'USD', 'GB': 'GBP', 'UK': 'GBP',
  'CA': 'CAD', 'AU': 'AUD', 'EU': 'EUR'
}

const COUNTRY_FLAGS = {
  'SA': '🇸🇦', 'AE': '🇦🇪', 'OM': '🇴🇲', 'BH': '🇧🇭', 'KW': '🇰🇼', 'QA': '🇶🇦',
  'IN': '🇮🇳', 'PK': '🇵🇰', 'JO': '🇯🇴', 'US': '🇺🇸', 'GB': '🇬🇧', 'UK': '🇬🇧',
  'CA': '🇨🇦', 'AU': '🇦🇺'
}

const CountryContext = createContext(null)

export function CountryProvider({ children }) {
  const [country, setCountryState] = useState(() => {
    try {
      return localStorage.getItem('selected_country') || 'SA'
    } catch {
      return 'SA'
    }
  })
  const [autoDetected, setAutoDetected] = useState(false)

  // Auto-detect country on first load
  useEffect(() => {
    const hasSelectedBefore = localStorage.getItem('country_selected_manually')
    if (hasSelectedBefore) return // Don't auto-detect if user manually selected

    const detectCountry = async () => {
      try {
        // Use free IP geolocation API
        const res = await fetch('https://ipapi.co/json/', { timeout: 3000 })
        if (!res.ok) throw new Error('Failed')
        const data = await res.json()
        const detectedCode = data.country_code?.toUpperCase()
        
        // Map to supported countries
        const supportedCountries = ['SA', 'AE', 'OM', 'BH', 'KW', 'QA', 'IN', 'PK', 'JO', 'US', 'GB', 'CA', 'AU']
        if (detectedCode && supportedCountries.includes(detectedCode)) {
          setCountryState(detectedCode)
          localStorage.setItem('selected_country', detectedCode)
          setAutoDetected(true)
          // Emit event for components listening
          window.dispatchEvent(new CustomEvent('countryChanged', { detail: { code: detectedCode } }))
        } else if (detectedCode === 'UK') {
          setCountryState('GB')
          localStorage.setItem('selected_country', 'GB')
          setAutoDetected(true)
          window.dispatchEvent(new CustomEvent('countryChanged', { detail: { code: 'GB' } }))
        }
      } catch (err) {
        console.log('Country auto-detection failed, using default')
      }
    }
    
    detectCountry()
  }, [])

  // Set country and emit event
  const setCountry = useCallback((code) => {
    setCountryState(code)
    localStorage.setItem('selected_country', code)
    localStorage.setItem('country_selected_manually', 'true')
    // Emit global event for all components
    window.dispatchEvent(new CustomEvent('countryChanged', { detail: { code } }))
  }, [])

  const currency = COUNTRY_TO_CURRENCY[country] || 'SAR'
  const flag = COUNTRY_FLAGS[country] || '🌍'

  return (
    <CountryContext.Provider value={{ 
      country, 
      setCountry, 
      currency, 
      flag,
      autoDetected,
      COUNTRY_TO_CURRENCY,
      COUNTRY_FLAGS
    }}>
      {children}
    </CountryContext.Provider>
  )
}

export function useCountry() {
  const context = useContext(CountryContext)
  if (!context) {
    // Fallback for components outside provider
    return {
      country: localStorage.getItem('selected_country') || 'SA',
      setCountry: () => {},
      currency: 'SAR',
      flag: '🌍',
      autoDetected: false,
      COUNTRY_TO_CURRENCY,
      COUNTRY_FLAGS
    }
  }
  return context
}

// Hook to listen for country changes
export function useCountryChange(callback) {
  useEffect(() => {
    const handler = (e) => callback(e.detail?.code)
    window.addEventListener('countryChanged', handler)
    return () => window.removeEventListener('countryChanged', handler)
  }, [callback])
}

export default CountryContext
