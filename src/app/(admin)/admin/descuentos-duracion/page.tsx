import { getDescuentos } from '@/lib/descuentos';
import { DescuentoDuracionManager } from '@/components/admin/descuento-duracion-manager'
import { PageHeader } from '@/components/admin/page-header'

export default async function DescuentosDuracionAdminPage() {
  const descuentos = await getDescuentos();

  return (
    <div className="container py-8">
      <PageHeader
        title="Descuentos por Duración"
        description="Gestiona los descuentos según la duración de suscripción"
      />
      <DescuentoDuracionManager initialDescuentos={descuentos} />
    </div>
  )
}