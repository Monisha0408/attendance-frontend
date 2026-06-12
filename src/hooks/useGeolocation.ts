import { useState } from 'react'

export interface GeoPosition {
  latitude: number
  longitude: number
  location_name: string
  source: 'gps' | 'ip'  // so admin can see how location was obtained
}

export function useGeolocation() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // ✅ IP-based fallback — works without any browser permission
  const getIPLocation = async (): Promise<GeoPosition | null> => {
    try {
      const res = await fetch('https://ipapi.co/json/')
      const data = await res.json()
      if (data.latitude && data.longitude) {
        const location_name = [data.city, data.region, data.country_name]
          .filter(Boolean).join(', ')
        return {
          latitude: data.latitude,
          longitude: data.longitude,
          location_name: location_name || 'Unknown (IP)',
          source: 'ip',
        }
      }
    } catch {}
    return null
  }

  const getPosition = (): Promise<GeoPosition | null> => {
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        // No GPS support — fall back to IP immediately
        setLoading(true)
        getIPLocation().then(pos => {
          setLoading(false)
          resolve(pos)
        })
        return
      }

      setLoading(true)
      setError(null)

      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          // ✅ GPS succeeded — reverse geocode to get address
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
          resolve({ latitude, longitude, location_name, source: 'gps' })
        },
        async (err) => {
          // ✅ GPS denied or failed — silently fall back to IP location
          const ipPos = await getIPLocation()
          setLoading(false)
          if (ipPos) {
            // Don't show error — IP location worked fine
            resolve(ipPos)
          } else {
            setError('Location unavailable. Check-in saved without location.')
            resolve(null)
          }
        },
        { timeout: 10000, maximumAge: 60000, enableHighAccuracy: true }
      )
    })
  }

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
