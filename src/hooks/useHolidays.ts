import { useState, useEffect } from 'react'
import api from '../utils/api'
import { Holiday } from '../types'

export function useHolidays() {
  const [holidays, setHolidays] = useState<Holiday[]>([])

  useEffect(() => {
    api.get('/holidays').then(r => setHolidays(r.data)).catch(() => {})
  }, [])

  const isHoliday = (dateStr: string): string | null => {
    const h = holidays.find(h => h.date === dateStr)
    return h ? h.name : null
  }

  const isSunday = (dateStr: string): boolean => {
    return new Date(dateStr + 'T00:00:00').getDay() === 0
  }

  const isNonWorkingDay = (dateStr: string): boolean => {
    return isSunday(dateStr) || !!isHoliday(dateStr)
  }

  return { holidays, isHoliday, isSunday, isNonWorkingDay }
}
