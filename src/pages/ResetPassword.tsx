import { Link } from 'react-router-dom'
import { useState, type FormEvent } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { toast } from 'sonner'

export default function ResetPassword() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setLoading(true)
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/update-password`,
    })
    setLoading(false)
    if (error) toast.error(error.message)
    else setSent(true)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-md">
        <Link to="/" className="flex items-center gap-3 mb-8 justify-center">
          <img src="/logo-ccoo.svg" alt="CCOO" style={{height:'36px'}} />
          <span style={{color:'#CC0000', fontWeight:900, fontSize:'1.3rem', fontFamily:'Arial Black, sans-serif'}}>Jorgetron</span>
        </Link>
        <div className="bg-card border border-border rounded-2xl p-8 shadow-sm">
          <h1 className="text-2xl font-bold mb-1">Restablecer contraseña</h1>
          <p className="text-sm text-muted-foreground mb-6">Te enviaremos un enlace para restablecer tu contraseña.</p>
          {sent ? (
            <div className="text-center space-y-4">
              <p className="text-sm text-green-600 font-medium">✅ Correo enviado. Revisa tu bandeja de entrada.</p>
              <Link to="/login" className="text-accent font-medium hover:underline text-sm">Volver al inicio de sesión</Link>
            </div>
          ) : (
            <form onSubmit={onSubmit} className="space-y-4">
              <div>
                <label className="text-sm font-medium block mb-1.5">Email</label>
                <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring" />
              </div>
              <button type="submit" disabled={loading} className="w-full py-2.5 bg-primary text-primary-foreground rounded-lg font-medium hover:opacity-90 transition disabled:opacity-50">
                {loading ? 'Enviando…' : 'Enviar enlace'}
              </button>
            </form>
          )}
          <p className="mt-6 text-sm text-center text-muted-foreground">
            <Link to="/login" className="text-accent font-medium hover:underline">Volver al inicio de sesión</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
