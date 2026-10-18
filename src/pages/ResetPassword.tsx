import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/contexts/AuthContext'

export default function UpdatePassword() {
  const { session, loading } = useAuth()
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [saving, setSaving] = useState(false)

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (password.length < 6) {
      toast.error('La contraseña debe tener al menos 6 caracteres')
      return
    }
    if (password !== confirm) {
      toast.error('Las contraseñas no coinciden')
      return
    }
    setSaving(true)
    const { error } = await supabase.auth.updateUser({ password })
    setSaving(false)
    if (error) {
      toast.error(error.message)
      return
    }
    toast.success('Contraseña actualizada correctamente')
    navigate('/app')
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-md">
        <Link to="/" className="flex items-center gap-3 mb-8 justify-center">
          <img src="/logo-ccoo.svg" alt="CCOO" style={{height:'36px'}} />
          <span style={{color:'#CC0000', fontWeight:900, fontSize:'1.3rem', fontFamily:'Arial Black, sans-serif'}}>Jorgetron</span>
        </Link>
        <div className="bg-card border border-border rounded-2xl p-8 shadow-sm">
          {loading ? (
            <p className="text-sm text-center text-muted-foreground">Cargando…</p>
          ) : !session ? (
            <div className="text-center space-y-4">
              <h1 className="text-2xl font-bold">Enlace no válido o caducado</h1>
              <p className="text-sm text-muted-foreground">Solicita un nuevo enlace de recuperación.</p>
              <Link to="/reset-password" className="text-accent font-medium hover:underline text-sm">Solicitar nuevo enlace</Link>
            </div>
          ) : (
            <>
              <h1 className="text-2xl font-bold mb-1">Nueva contraseña</h1>
              <p className="text-sm text-muted-foreground mb-6">Escribe la nueva contraseña para tu cuenta.</p>
              <form onSubmit={onSubmit} className="space-y-4">
                <div>
                  <label className="text-sm font-medium block mb-1.5">Nueva contraseña</label>
                  <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring" />
                </div>
                <div>
                  <label className="text-sm font-medium block mb-1.5">Repite la contraseña</label>
                  <input type="password" required value={confirm} onChange={(e) => setConfirm(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring" />
                </div>
                <button type="submit" disabled={saving} className="w-full py-2.5 bg-primary text-primary-foreground rounded-lg font-medium hover:opacity-90 transition disabled:opacity-50">
                  {saving ? 'Guardando…' : 'Guardar contraseña'}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
