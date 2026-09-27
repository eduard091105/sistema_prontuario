import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL ?? ''
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY ?? ''
const rememberSessionKey = 'fonoativa:remember-session'

const authStorage = {
  getItem: (key: string) => {
    if (typeof window === 'undefined') return null
    return window.sessionStorage.getItem(key) ?? window.localStorage.getItem(key)
  },
  setItem: (key: string, value: string) => {
    if (typeof window === 'undefined') return
    if (window.sessionStorage.getItem(rememberSessionKey) === 'false') {
      window.sessionStorage.setItem(key, value)
      window.localStorage.removeItem(key)
    } else {
      window.localStorage.setItem(key, value)
      window.sessionStorage.removeItem(key)
    }
  },
  removeItem: (key: string) => {
    if (typeof window === 'undefined') return
    window.localStorage.removeItem(key)
    window.sessionStorage.removeItem(key)
  },
}

export const setRememberSession = (remember: boolean) => {
  if (typeof window !== 'undefined') {
    window.sessionStorage.setItem(rememberSessionKey, String(remember))
  }
}

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey)
export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storage: authStorage,
      },
    })
  : null
