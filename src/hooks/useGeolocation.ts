import { useState } from 'react'

export interface GeoPosition {
  latitude: number
  longitude: number
  location_name: string
}

export function useGeolocation() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const getPosition = (): Promise<GeoPosition | null> => {
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        resolve(null)
        return
      }
      setLoading(true)
      setError(null)
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const { latitude, longitude } = pos.coords
          // Reverse geocode using free nominatim API
          let location_name = `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`
          try {
            const res = await fetch(
              `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`,
              { headers: { 'Accept-Language': 'en' } }
            )
            const data = await res.json()
            if (data.display_name) {
              // Shorten: first two parts of address
              const parts = data.display_name.split(',')
              location_name = parts.slice(0, 3).join(',').trim()
            }
          } catch {}
          setLoading(false)
          resolve({ latitude, longitude, location_name })
        },
        (err) => {
          setLoading(false)
          setError('Location access denied — check-in will proceed without location.')
          resolve(null)
        },
        { timeout: 8000, maximumAge: 60000 }
      )
    })
  }

  return { getPosition, loading, error }
}
