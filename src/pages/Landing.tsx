import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { Calculator, Clock, ShieldCheck } from 'lucide-react'
import { useEffect } from 'react'

export default function Landing() {
  const { session, loading } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (!loading && session) navigate('/app')
  }, [loading, session, navigate])

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      <div className="absolute inset-0 -z-10 opacity-40">
        <div className="absolute -top-40 -right-20 h-96 w-96 rounded-full bg-accent/30 blur-3xl" />
        <div className="absolute top-40 -left-20 h-96 w-96 rounded-full bg-primary/20 blur-3xl" />
      </div>
      <nav className="max-w-6xl mx-auto px-6 py-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span style={{display:'inline-block', backgroundColor:'#CC0000', color:'white', fontWeight:900, fontSize:'18px', fontFamily:'Arial Black, sans-serif', padding:'4px 8px', borderRadius:'4px'}}>CC.OO</span>
          <span style={{color:'#CC0000', fontWeight:900, fontSize:'1.5rem', fontFamily:'Arial Black, sans-serif'}}>Jorgetron</span>
        </div>
        <div className="flex gap-2">
          <Link to="/login" className="px-4 py-2 text-sm font-medium hover:text-accent transition">Iniciar sesión</Link>
          <Link to="/signup" className="px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition">Crear cuenta</Link>
        </div>
      </nav>
      <main className="max-w-6xl mx-auto px-6 pt-20 pb-32">
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 rounded-full bg-accent/10 px-3 py-1 text-xs font-semibold border border-accent/30 mb-6">
            <Clock className="h-3 w-3" /> Cálculo automático mensual
          </div>
          <h1 className="text-5xl md:text-7xl font-bold tracking-tight leading-[1.05]" style={{fontFamily:'Sora, sans-serif'}}>
            Tus turnos.<br />
            <span className="text-accent">Tus pluses.</span><br />
            Calculados solos.
          </h1>
          <p className="mt-6 text-lg text-muted-foreground max-w-2xl">
            Introduce tus horarios del mes y obtén al instante todos los pluses generados
            (domingo, festivo, nocturnidad, madrugue, jornada partida, extras y dietas),
            las horas totales y el porcentaje de jornada cumplida.
          </p>
          <div className="mt-8 flex gap-3">
            <Link to="/signup" className="px-6 py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:opacity-90 transition">Empezar gratis</Link>
            <Link to="/login" className="px-6 py-3 border border-border rounded-lg font-medium hover:bg-secondary transition">Ya tengo cuenta</Link>
          </div>
        </div>
        <div className="mt-24 grid md:grid-cols-3 gap-6">
          {[
            { icon: Calculator, t: 'Todos los pluses', d: 'Domingos, festivos, nocturnidad, madrugue, partida, extras diurnas y nocturnas, dietas.' },
            { icon: Clock, t: '% de jornada', d: 'Ideal para tiempo parcial: ajusta tu % y compara horas reales vs objetivo mensual.' },
            { icon: ShieldCheck, t: 'Privado y seguro', d: 'Cada trabajador ve solo sus datos. Variables configurables por cuenta.' },
          ].map(({ icon: Icon, t, d }) => (
            <div key={t} className="rounded-2xl border border-border bg-card p-6">
              <Icon className="h-6 w-6 text-accent" />
              <h3 className="mt-4 font-semibold">{t}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{d}</p>
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}
