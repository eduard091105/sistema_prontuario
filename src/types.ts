export type Section =
  | 'dashboard'
  | 'agenda'
  | 'patients'
  | 'records'
  | 'activities'
  | 'settings'

export type AppointmentStatus =
  | 'Agendado'
  | 'Em atendimento'
  | 'Concluído'
  | 'Faltou'
  | 'Cancelado'

export type PatientStatus = 'Ativo' | 'Em espera' | 'Arquivado'

export type DetailTab =
  | 'resumo'
  | 'anamnese'
  | 'objetivos'
  | 'atividades'
  | 'historico'
  | 'prontuario'

export interface Settings {
  consultationTimes: string[]
  workDays: string[]
  professionals: string[]
  rooms: string[]
  referrals: string[]
  clinicName: string
  professionalName: string
  contactEmail: string
}

export interface Anamnese {
  diagnosticos: string
  queixaPrincipal: string
  historicoClinico: string
  historicoDesenvolvimento: string
  desenvolvimentoLinguagem: string
  desenvolvimentoFala: string
  aspectosCognitivos: string
  atencao: string
  memoria: string
  socializacao: string
  comunicacao: string
  compreensao: string
  expressao: string
  comportamentoObservado: string
  dificuldadesIdentificadas: string
  potencialidades: string
  objetivosTerapauticos: string
  observacoesAdicionais: string
  dataRegistro: string
  dataAtualizacao: string
}

export interface Patient {
  id: string
  name: string
  dob: string
  legalResponsible: string
  phone: string
  administrativeInfo: string
  observations: string
  activitiesPerformed: string
  nextRoom: string
  status: PatientStatus
  referral: string
  difficulties: string[]
  therapeuticObjectives: string[]
  anamnesis: Anamnese
}

export interface Appointment {
  id: string
  patientId: string
  date: string
  time: string
  status: AppointmentStatus
  professional: string
  room: string
  notes: string
}

export interface TherapyCategory {
  id: string
  name: string
  description: string
}

export interface TherapyActivity {
  id: string
  name: string
  categoryId: string
  objective: string
  skills: string[]
  description: string
  materials: string[]
  application: string
  adaptations: string[]
  ageRange?: string
}

export interface LibraryState {
  categories: TherapyCategory[]
  activities: TherapyActivity[]
  favorites: string[]
}

export interface Evolution {
  id: string
  patientId: string
  appointmentId: string
  date: string
  time: string
  patientName: string
  professional: string
  activity: string
  goal: string
  skills: string
  description: string
  performance: string
  difficulties: string
  response: string
  achieved: string
  observations: string
  conduct: string
  isDraft: boolean
  status: 'Rascunho' | 'Finalizada'
  author: string
  createdAt: string
}

export interface AppData {
  settings: Settings
  patients: Patient[]
  appointments: Appointment[]
  evolutions: Evolution[]
  library: LibraryState
}
