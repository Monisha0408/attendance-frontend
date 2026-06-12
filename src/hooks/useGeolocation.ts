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
        setError('Geolocation not supported by this browser.')
        resolve(null)
        return
      }
      setLoading(true)
      setError(null)
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const { latitude, longitude } = pos.coords
          let location_name = `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`
          try {
            const res = await fetch(
              `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`,
              { headers: { 'Accept-Language': 'en' } }
            )
            const data = await res.json()
            if (data.display_name) {
              const parts = data.display_name.split(',')
              location_name = parts.slice(0, 3).join(',').trim()
            }
          } catch {}
          setLoading(false)
          resolve({ latitude, longitude, location_name })
        },
        (err) => {
          setLoading(false)
          // ✅ Clear error message explaining what happened
          if (err.code === 1) {
            setError('Location permission denied. Check-in saved without location. To enable, click the lock icon in your browser address bar.')
          } else if (err.code === 2) {
            setError('Location unavailable. Check-in saved without location.')
          } else {
            setError('Location timed out. Check-in saved without location.')
          }
          resolve(null) // proceed without location
        },
        { timeout: 10000, maximumAge: 60000, enableHighAccuracy: true }
      )
    })
  }

  // ✅ Pre-request permission so browser prompt appears before check-in
  const requestPermission = (): Promise<boolean> => {
    return new Promise((resolve) => {
      if (!navigator.geolocation) { resolve(false); return }
      navigator.geolocation.getCurrentPosition(
        () => resolve(true),
        () => resolve(false),
        { timeout: 5000 }
      )
    })
  }

  return { getPosition, requestPermission, loading, error }
}
