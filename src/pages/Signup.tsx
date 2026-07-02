import { Link, useNavigate } from 'react-router-dom'
import { useState, type FormEvent, useEffect } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/contexts/AuthContext'
import { toast } from 'sonner'

export default function Signup() {
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [privacy, setPrivacy] = useState(false)
  const [loading, setLoading] = useState(false)
  const { session } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (session) navigate('/app')
  }, [session, navigate])

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setLoading(true)
    const { error } = await supabase.auth.signUp({
      email, password,
      options: { emailRedirectTo: `${window.location.origin}/app`, data: { full_name: fullName } },
    })
    setLoading(false)
    if (error) toast.error(error.message)
    else toast.success('Cuenta creada. ¡Bienvenido!')
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-md">
        <Link to="/" className="flex items-center gap-3 mb-8 justify-center">
          <img src="/logo-ccoo.svg" alt="CCOO" style={{height:'36px'}} />
          <span style={{color:'#CC0000', fontWeight:900, fontSize:'1.3rem', fontFamily:'Arial Black, sans-serif'}}>Jorgetron</span>
        </Link>
        <div className="bg-card border border-border rounded-2xl p-8 shadow-sm">
          <h1 className="text-2xl font-bold mb-1">Crear cuenta</h1>
          <p className="text-sm text-muted-foreground mb-6">Empieza a registrar tus turnos.</p>
          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <label className="text-sm font-medium block mb-1.5">Nombre completo</label>
              <input required value={fullName} onChange={(e) => setFullName(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>
            <div>
              <label className="text-sm font-medium block mb-1.5">Email</label>
              <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>
            <div>
              <label className="text-sm font-medium block mb-1.5">Contraseña</label>
              <input type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>
            <label className="flex items-start gap-2 text-sm">
              <input type="checkbox" checked={privacy} onChange={(e) => setPrivacy(e.target.checked)} className="mt-1" />
              <span>He leído y acepto la <Link to="/privacy" className="text-accent font-medium hover:underline">política de privacidad</Link></span>
            </label>
            <button type="submit" disabled={loading || !privacy} className="w-full py-2.5 bg-primary text-primary-foreground rounded-lg font-medium hover:opacity-90 transition disabled:opacity-50">
              {loading ? 'Creando…' : 'Crear cuenta'}
            </button>
          </form>
          <p className="mt-6 text-sm text-center text-muted-foreground">
            ¿Ya tienes cuenta?{' '}
            <Link to="/login" className="text-accent font-medium hover:underline">Inicia sesión</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
