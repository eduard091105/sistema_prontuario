export const formatDate = (value: string) => {
  if (!value) return '-'

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value

  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date)
}

export const formatDateTime = (date: string, time: string) => {
  if (!date) return '-'
  return `${formatDate(date)} • ${time || '-'}`
}

export const ageFromBirthDate = (dob: string) => {
  if (!dob) return '-'

  const birthDate = new Date(dob)
  const today = new Date()
  let age = today.getFullYear() - birthDate.getFullYear()
  const monthDifference = today.getMonth() - birthDate.getMonth()

  if (monthDifference < 0 || (monthDifference === 0 && today.getDate() < birthDate.getDate())) {
    age -= 1
  }

  return `${age} anos`
}

export const getStatusClass = (status: string) => {
  const palette: Record<string, string> = {
    Agendado: 'bg-sky-100 text-sky-700 border-sky-200',
    'Em atendimento': 'bg-amber-100 text-amber-700 border-amber-200',
    Concluído: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    Faltou: 'bg-rose-100 text-rose-700 border-rose-200',
    Cancelado: 'bg-slate-200 text-slate-700 border-slate-300',
  }

  return palette[status] ?? 'bg-slate-100 text-slate-700 border-slate-200'
}
