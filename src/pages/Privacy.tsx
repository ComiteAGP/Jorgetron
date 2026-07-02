import { Link } from 'react-router-dom'

export default function Privacy() {
  return (
    <div className="min-h-screen bg-background px-4 py-12">
      <div className="max-w-3xl mx-auto">
        <Link to="/" className="flex items-center gap-3 mb-8">
          <img src="/logo-ccoo.svg" alt="CCOO" style={{height:'36px'}} />
          <span style={{color:'#CC0000', fontWeight:900, fontSize:'1.3rem', fontFamily:'Arial Black, sans-serif'}}>Jorgetron</span>
        </Link>
        <div className="bg-card border border-border rounded-2xl p-8">
          <h1 className="text-2xl font-bold mb-6">Política de Privacidad</h1>
          
          <h2 className="text-lg font-bold mt-6 mb-2">1. Responsable del tratamiento</h2>
          <p className="text-sm text-muted-foreground">Jorge Duarte Lueje, Delegado Sindical de CCOO en Azul Handling. Contacto: comiteazulagp@gmail.com</p>

          <h2 className="text-lg font-bold mt-6 mb-2">2. Finalidad</h2>
          <p className="text-sm text-muted-foreground">Los datos recogidos (nombre, email y turnos de trabajo) se utilizan exclusivamente para calcular las variables salariales de cada trabajador afiliado. No se utilizarán para ningún otro fin.</p>

          <h2 className="text-lg font-bold mt-6 mb-2">3. Datos que se recogen</h2>
          <p className="text-sm text-muted-foreground">Nombre completo, dirección de email y horarios de trabajo introducidos por el propio usuario.</p>

          <h2 className="text-lg font-bold mt-6 mb-2">4. Base legal</h2>
          <p className="text-sm text-muted-foreground">El tratamiento se basa en el consentimiento expreso del trabajador, que puede retirarse en cualquier momento.</p>

          <h2 className="text-lg font-bold mt-6 mb-2">5. Destinatarios</h2>
          <p className="text-sm text-muted-foreground">Los datos no se cederán a terceros. Se almacenan de forma segura en Supabase (UE). Cada trabajador solo puede ver sus propios datos.</p>

          <h2 className="text-lg font-bold mt-6 mb-2">6. Derechos</h2>
          <p className="text-sm text-muted-foreground">Puedes ejercer tus derechos de acceso, rectificación, supresión, oposición y portabilidad escribiendo a comiteazulagp@gmail.com</p>

          <h2 className="text-lg font-bold mt-6 mb-2">7. Conservación</h2>
          <p className="text-sm text-muted-foreground">Los datos se conservarán mientras el trabajador mantenga su cuenta activa. Puede solicitar la eliminación de su cuenta y datos en cualquier momento.</p>

          <h2 className="text-lg font-bold mt-6 mb-2">8. Contacto</h2>
          <p className="text-sm text-muted-foreground">Para cualquier consulta sobre privacidad: comiteazulagp@gmail.com</p>
        </div>
        <p className="mt-6 text-center">
          <Link to="/login" className="text-accent font-medium hover:underline text-sm">Volver al inicio de sesión</Link>
        </p>
      </div>
    </div>
  )
}
