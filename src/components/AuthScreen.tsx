import { useState } from 'react'
import { LockKeyhole, Stethoscope } from 'lucide-react'

import { isSupabaseConfigured, setRememberSession, supabase } from '../lib/supabase'
import '../Auth.css'

export function AuthScreen() {
  const [rememberMe, setRememberMe] = useState(() => typeof window !== 'undefined' && window.localStorage.getItem('fonoativa:remember-email') !== 'false')
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [email, setEmail] = useState(() => {
    if (typeof window === 'undefined' || window.localStorage.getItem('fonoativa:remember-email') === 'false') return ''
    return window.localStorage.getItem('fonoativa:saved-email') ?? ''
  })
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!supabase) return

    setBusy(true)
    setMessage('')
    setError('')
    setRememberSession(mode === 'login' ? rememberMe : true)
    if (mode === 'login' && rememberMe) {
      window.localStorage.setItem('fonoativa:remember-email', 'true')
      window.localStorage.setItem('fonoativa:saved-email', email.trim())
    } else if (mode === 'login') {
      window.localStorage.setItem('fonoativa:remember-email', 'false')
      window.localStorage.removeItem('fonoativa:saved-email')
    }

    try {
      if (mode === 'login') {
        const { error: authError } = await supabase.auth.signInWithPassword({ email, password })
        if (authError) throw authError
      } else {
        const { data, error: authError } = await supabase.auth.signUp({ email, password })
        if (authError) throw authError
        if (!data.session) {
          setMessage('O Supabase ainda exige confirmação por e-mail. Para dispensá-la, desative “Confirm email” nas configurações de autenticação do projeto.')
        }
      }
    } catch (authError) {
      const detail = authError instanceof Error ? authError.message : ''
      const normalized = detail.toLowerCase()
      if (normalized.includes('email rate limit exceeded') || normalized.includes('over_email_send_rate_limit') || normalized.includes('rate limit')) {
        setError('O Supabase limitou temporariamente o envio de e-mails. Aguarde antes de tentar novamente. Se sua conta já existe, use “Entrar” em vez de criar outra.')
      } else if (normalized.includes('invalid login credentials')) {
        setError('E-mail ou senha incorretos. Confira os dados ou crie sua conta.')
      } else {
        setError(detail || 'Não foi possível autenticar. Confira sua conexão com o Supabase.')
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="auth-shell">
      <section className="auth-panel">
        <div className="auth-brand">
          <div className="auth-icon"><Stethoscope aria-hidden="true" /></div>
          <div>
            <p>Fonoativa</p>
            <h1>Prontuário</h1>
          </div>
        </div>

        {!isSupabaseConfigured ? (
          <div className="auth-message-block">
            <LockKeyhole aria-hidden="true" />
            <h2>Conecte seu projeto Supabase</h2>
            <p>Configure as variáveis locais e execute o schema SQL para habilitar login e salvamento seguro.</p>
            <code>VITE_SUPABASE_URL</code>
            <code>VITE_SUPABASE_ANON_KEY</code>
          </div>
        ) : (
          <>
            <div className="auth-heading">
              <p className="eyebrow">Área profissional</p>
              <h2>{mode === 'login' ? 'Entrar na sua conta' : 'Criar conta profissional'}</h2>
              <p>Seus dados clínicos ficam privados e vinculados à sua conta.</p>
            </div>

            <form className="auth-form" onSubmit={submit}>
              <label>
                E-mail
                <input type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
              </label>
              <label>
                Senha
                <input type="password" autoComplete={mode === 'login' ? 'current-password' : 'new-password'} minLength={8} value={password} onChange={(event) => setPassword(event.target.value)} required />
              </label>
              {mode === 'login' && (
                <label className="remember-option">
                  <input type="checkbox" checked={rememberMe} onChange={(event) => setRememberMe(event.target.checked)} />
                  <span>Lembrar de mim neste dispositivo</span>
                </label>
              )}
              {error && <p className="auth-error" role="alert">{error}</p>}
              {message && <p className="auth-success" role="status">{message}</p>}
              <button className="primary-button auth-submit" type="submit" disabled={busy}>
                {busy ? 'Aguarde...' : mode === 'login' ? 'Entrar' : 'Criar conta'}
              </button>
            </form>

            <button type="button" className="auth-mode-toggle" onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setError(''); setMessage('') }}>
              {mode === 'login' ? 'Ainda não tem conta? Criar conta' : 'Já tem conta? Entrar'}
            </button>
          </>
        )}
      </section>
      <footer className="auth-footer">Todos os direitos reservados Eduardo Cesar Gonçalves 2026</footer>
    </main>
  )
}