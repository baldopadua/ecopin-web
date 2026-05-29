'use client'
import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function AuthPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLogin, setIsLogin] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const router = useRouter()

  async function handleSubmit() {
    setLoading(true); setError(null)
    let result

    if (isLogin) {
      result = await supabase.auth.signInWithPassword({ email, password })
    } else {
      result = await supabase.auth.signUp({ email, password })
    }

    if (result.error) {
      setError(result.error.message)
    } else {
      router.push('/dashboard')
    }
    setLoading(false)
  }

  return (
    <div style={{ maxWidth: 400, margin: '80px auto', padding: 32 }}>
      <h1>{isLogin ? 'LGU Login' : 'Register'}</h1>
      <input type="email" placeholder="Email"
        value={email} onChange={e => setEmail(e.target.value)}
        style={{ display: 'block', width: '100%', marginBottom: 12 }} />
      <input type="password" placeholder="Password"
        value={password} onChange={e => setPassword(e.target.value)}
        style={{ display: 'block', width: '100%', marginBottom: 16 }} />
      {error && <p style={{ color: 'red' }}>{error}</p>}
      <button onClick={handleSubmit} disabled={loading}>
        {loading ? 'Loading...' : isLogin ? 'Login' : 'Register'}
      </button>
      <p style={{ marginTop: 16, cursor: 'pointer', color: 'blue' }}
        onClick={() => setIsLogin(!isLogin)}>
        {isLogin ? 'No account? Register' : 'Have account? Login'}
      </p>
    </div>
  )
}