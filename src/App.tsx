import { useEffect, useMemo, useState } from 'react'
import {
  Activity,
  ArrowLeft,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  CalendarPlus,
  CalendarDays,
  ClipboardList,
  FileSpreadsheet,
  FileText,
  LayoutDashboard,
  ListChecks,
  LogOut,
  Menu,
  Pencil,
  Plus,
  Printer,
  Search,
  Settings,
  Stethoscope,
  UserRoundPlus,
  X,
} from 'lucide-react'

import { defaultData } from './data/mockData'
import { ageFromBirthDate, formatDate, getStatusClass } from './lib/formatters'
import { AuthScreen } from './components/AuthScreen'
import { isSupabaseConfigured, supabase } from './lib/supabase'
import { loadWorkspace, saveWorkspace } from './lib/workspace'
import type { Anamnese, Appointment, AppointmentStatus, DetailTab, Patient, PatientStatus, Section } from './types'
import type { Session } from '@supabase/supabase-js'
import './App.css'

const navigation = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'agenda', label: 'Agenda', icon: CalendarDays },
  { id: 'patients', label: 'Pacientes', icon: UserRoundPlus },
  { id: 'records', label: 'Prontuários', icon: FileText },
  { id: 'activities', label: 'Atividades terapêuticas', icon: Activity },
  { id: 'settings', label: 'Configurações', icon: Settings },
] as const

const dateToInput = (date: Date) => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}
const today = dateToInput(new Date())
const startOfWeek = (date: Date) => {
  const monday = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7))
  return monday
}
const startOfMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth(), 1)
const addDays = (date: Date, amount: number) => {
  const next = new Date(date)
  next.setDate(next.getDate() + amount)
  return next
}
const emptyAnamnesis = (): Anamnese => ({
  diagnosticos: '',
  queixaPrincipal: '',
  historicoClinico: '',
  historicoDesenvolvimento: '',
  desenvolvimentoLinguagem: '',
  desenvolvimentoFala: '',
  aspectosCognitivos: '',
  atencao: '',
  memoria: '',
  socializacao: '',
  comunicacao: '',
  compreensao: '',
  expressao: '',
  comportamentoObservado: '',
  dificuldadesIdentificadas: '',
  potencialidades: '',
  objetivosTerapauticos: '',
  observacoesAdicionais: '',
  dataRegistro: dateToInput(new Date()),
  dataAtualizacao: dateToInput(new Date()),
})

const emptyForm = {
  name: '',
  dob: '',
  phone: '',
  legalResponsible: '',
  administrativeInfo: '',
  mainComplaint: '',
  activitiesPerformed: '',
  referral: '',
  nextRoom: 'Sala 1',
  status: 'Ativo' as PatientStatus,
}

function App() {
  const [section, setSection] = useState<Section>('dashboard')
  const [sectionHistory, setSectionHistory] = useState<Section[]>([])
  const [session, setSession] = useState<Session | null>(null)
  const [authLoading, setAuthLoading] = useState(Boolean(supabase))
  const [authError, setAuthError] = useState('')
  const [workspaceLoadResult, setWorkspaceLoadResult] = useState<{ userId: string; status: 'ready' | 'error'; error?: string } | null>(null)
  const [workspaceReload, setWorkspaceReload] = useState(0)
  const [syncStatus, setSyncStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [syncError, setSyncError] = useState('')
  const [data, setData] = useState(defaultData)
  const [patientFilter, setPatientFilter] = useState('')
  const [selectedPatientId, setSelectedPatientId] = useState<string>('')
  const [selectedTab, setSelectedTab] = useState<DetailTab>('resumo')
  const [selectedAppointmentId, setSelectedAppointmentId] = useState<string>('')
  const [showPatientForm, setShowPatientForm] = useState(false)
  const [patientFormMode, setPatientFormMode] = useState<'create' | 'edit'>('create')
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [showAppointmentForm, setShowAppointmentForm] = useState(false)
  const [appointmentForm, setAppointmentForm] = useState({
    patientId: '',
    date: dateToInput(new Date()),
    time: '09:00',
    professional: defaultData.settings.professionalName,
    room: defaultData.settings.rooms[0] ?? '',
    notes: '',
  })
  const [agendaDate, setAgendaDate] = useState(() => new Date())
  const [calendarMonth, setCalendarMonth] = useState(() => startOfMonth(new Date()))
  const currentUserId = session?.user.id
  const workspaceStatus = !currentUserId
    ? 'idle'
    : workspaceLoadResult?.userId === currentUserId
      ? workspaceLoadResult.status
      : 'loading'
  const workspaceError = currentUserId && workspaceLoadResult?.userId === currentUserId
    ? workspaceLoadResult.error ?? ''
    : ''

  useEffect(() => {
    if (!supabase) return

    let active = true
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (!active || event === 'INITIAL_SESSION') return
      setSession(nextSession)
      setAuthError('')
      if (!nextSession) {
        setData(defaultData)
        setWorkspaceLoadResult(null)
        setSyncStatus('idle')
        setSyncError('')
      }
    })

    void supabase.auth.getSession().then(({ data: sessionData, error }) => {
      if (!active) return
      if (error) setAuthError(error.message)
      setSession(sessionData.session)
      setAuthLoading(false)
    })

    return () => {
      active = false
      subscription.unsubscribe()
    }
  }, [])

  useEffect(() => {
    const userId = session?.user.id
    if (!userId) return

    let active = true
    void loadWorkspace(userId).then((workspace) => {
      if (!active) return
      setData(workspace)
      setWorkspaceLoadResult({ userId, status: 'ready' })
    }).catch((error: unknown) => {
      if (!active) return
      setWorkspaceLoadResult({
        userId,
        status: 'error',
        error: error instanceof Error ? error.message : 'Não foi possível carregar os dados.',
      })
    })

    return () => {
      active = false
    }
  }, [session?.user.id, workspaceReload])

  useEffect(() => {
    const userId = session?.user.id
    if (!userId || workspaceStatus !== 'ready') return

    let active = true
    const timeout = window.setTimeout(() => {
      setSyncStatus('saving')
      void saveWorkspace(userId, data).then(() => {
        if (!active) return
        setSyncStatus('saved')
        setSyncError('')
      }).catch((error: unknown) => {
        if (!active) return
        setSyncStatus('error')
        setSyncError(error instanceof Error ? error.message : 'Não foi possível salvar os dados.')
      })
    }, 700)

    return () => {
      active = false
      window.clearTimeout(timeout)
    }
  }, [data, session?.user.id, workspaceStatus])

  const navigateTo = (nextSection: Section) => {
    if (nextSection !== section) {
      setSectionHistory((history) => [...history, section])
      setSection(nextSection)
    }
    setMobileMenuOpen(false)
  }

  const goBack = () => {
    const previousSection = sectionHistory.at(-1)
    if (!previousSection) return

    setSectionHistory((history) => history.slice(0, -1))
    setSection(previousSection)
    setMobileMenuOpen(false)
  }

  const patients = data.patients
  const appointments = data.appointments
  const selectedPatient = useMemo(
    () => patients.find((patient) => patient.id === selectedPatientId) ?? patients[0] ?? null,
    [patients, selectedPatientId],
  )

  const filteredPatients = useMemo(() => {
    return patients.filter((patient) => {
      if (!patientFilter.trim()) return true
      return patient.name.toLowerCase().includes(patientFilter.toLowerCase())
    })
  }, [patients, patientFilter])

  const selectedAppointment = useMemo(
    () => appointments.find((item) => item.id === selectedAppointmentId) ?? appointments[0] ?? null,
    [appointments, selectedAppointmentId],
  )

  const patientAppointments = useMemo(
    () => (selectedPatient
      ? appointments
        .filter((item) => item.patientId === selectedPatient.id)
        .sort((first, second) => first.date.localeCompare(second.date) || first.time.localeCompare(second.time))
      : []),
    [appointments, selectedPatient],
  )

  const upcomingAppointments = useMemo(
    () => appointments.filter((item) => item.status !== 'Cancelado').slice(0, 4),
    [appointments],
  )

  const stats = {
    today: appointments.filter((item) => item.date === today).length,
    completed: appointments.filter((item) => item.status === 'Concluído').length,
    pending: appointments.filter((item) => item.status !== 'Concluído').length,
  }
  const calendarStart = startOfWeek(calendarMonth)
  const calendarRowCount = Math.ceil(((calendarStart.getDay() + 6) % 7 + new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 0).getDate()) / 7)
  const calendarDays = Array.from({ length: calendarRowCount * 7 }, (_, index) => addDays(calendarStart, index))
  const selectedDayKey = dateToInput(agendaDate)
  const selectedDayAppointments = appointments
    .filter((appointment) => appointment.date === selectedDayKey)
    .sort((first, second) => first.time.localeCompare(second.time))
  const selectedDayLabel = new Intl.DateTimeFormat('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' }).format(agendaDate)

  const handleSavePatient = (event: React.FormEvent) => {
    event.preventDefault()

    if (!form.name.trim()) {
      return
    }

    const editedPatient = patientFormMode === 'edit'
      ? patients.find((patient) => patient.id === selectedPatientId)
      : undefined
    const patientDetails = {
      name: form.name.trim(),
      dob: form.dob,
      legalResponsible: form.legalResponsible,
      phone: form.phone,
      administrativeInfo: form.administrativeInfo,
      observations: editedPatient?.observations ?? '',
      activitiesPerformed: form.activitiesPerformed,
      nextRoom: form.nextRoom,
      status: form.status,
      referral: form.referral,
      anamnesis: {
        ...(editedPatient?.anamnesis ?? emptyAnamnesis()),
        queixaPrincipal: form.mainComplaint,
        dataAtualizacao: dateToInput(new Date()),
      },
    }
    const newPatient: Patient = editedPatient
      ? { ...editedPatient, ...patientDetails }
      : {
        id: `patient-${Date.now()}`,
        ...patientDetails,
        difficulties: [],
        therapeuticObjectives: [],
      }

    setData((current) => ({
      ...current,
      patients: editedPatient
        ? current.patients.map((patient) => patient.id === editedPatient.id ? newPatient : patient)
        : [newPatient, ...current.patients],
    }))

    setSelectedPatientId(newPatient.id)
    setSelectedTab('resumo')
    navigateTo('patients')
    setShowPatientForm(false)
    setPatientFormMode('create')
    setForm(emptyForm)
  }

  const beginPatientEdit = (patient: Patient) => {
    setSelectedPatientId(patient.id)
    setPatientFormMode('edit')
    setForm({
      name: patient.name,
      dob: patient.dob,
      phone: patient.phone,
      legalResponsible: patient.legalResponsible,
      administrativeInfo: patient.administrativeInfo,
      mainComplaint: patient.anamnesis.queixaPrincipal,
      activitiesPerformed: patient.activitiesPerformed,
      referral: patient.referral,
      nextRoom: patient.nextRoom,
      status: patient.status,
    })
    setShowPatientForm(true)
  }

  const handleCreateAppointment = (event: React.FormEvent) => {
    event.preventDefault()
    const patient = patients.find((item) => item.id === appointmentForm.patientId)
    if (!patient || !appointmentForm.date || !appointmentForm.time) return

    const appointment: Appointment = {
      id: `appointment-${Date.now()}`,
      patientId: patient.id,
      date: selectedDayKey,
      time: appointmentForm.time,
      status: 'Agendado' satisfies AppointmentStatus,
      professional: appointmentForm.professional,
      room: appointmentForm.room || patient.nextRoom,
      notes: appointmentForm.notes,
    }

    setData((current) => ({ ...current, appointments: [...current.appointments, appointment] }))
    setSelectedAppointmentId(appointment.id)
    setAppointmentForm((current) => ({ ...current, date: selectedDayKey, notes: '' }))
    setShowAppointmentForm(false)
  }

  const exportPatients = async () => {
    if (patients.length === 0) return

    const ExcelJS = await import('exceljs')
    const workbook = new ExcelJS.Workbook()
    workbook.creator = data.settings.professionalName
    workbook.created = new Date()

    const worksheet = workbook.addWorksheet('Pacientes', {
      views: [{ state: 'frozen', ySplit: 1 }],
    })
    worksheet.columns = [
      { header: 'Nome', key: 'name', width: 30 },
      { header: 'Data de nascimento', key: 'dob', width: 20 },
      { header: 'Idade', key: 'age', width: 14 },
      { header: 'Telefone', key: 'phone', width: 18 },
      { header: 'Responsável legal', key: 'responsible', width: 26 },
      { header: 'Queixa principal', key: 'complaint', width: 36 },
      { header: 'Atividade realizada', key: 'activities', width: 36 },
      { header: 'Sala', key: 'room', width: 16 },
      { header: 'Encaminhamento', key: 'referral', width: 22 },
      { header: 'Status', key: 'status', width: 16 },
      { header: 'Informações administrativas', key: 'admin', width: 42 },
    ]

    patients.forEach((patient) => {
      const row = worksheet.addRow({
        name: patient.name,
        dob: patient.dob ? new Date(`${patient.dob}T12:00:00`) : null,
        age: patient.dob ? ageFromBirthDate(patient.dob) : '',
        phone: patient.phone,
        responsible: patient.legalResponsible,
        complaint: patient.anamnesis.queixaPrincipal,
        activities: patient.activitiesPerformed,
        room: patient.nextRoom,
        referral: patient.referral,
        status: patient.status,
        admin: patient.administrativeInfo,
      })
      row.getCell('dob').numFmt = 'dd/mm/yyyy'
      row.alignment = { vertical: 'top', wrapText: true }
    })

    const header = worksheet.getRow(1)
    header.height = 28
    header.font = { bold: true, color: { argb: 'FFFFFFFF' } }
    header.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF176F67' },
    }
    header.alignment = { vertical: 'middle', horizontal: 'left' }
    worksheet.autoFilter = `A1:K${patients.length + 1}`

    const buffer = await workbook.xlsx.writeBuffer()
    const blob = new Blob([new Uint8Array(buffer)], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `pacientes-${today}.xlsx`
    document.body.appendChild(link)
    link.click()
    link.remove()
    window.setTimeout(() => URL.revokeObjectURL(url), 1000)
  }

  const printRecords = () => {
    if (patients.length > 0) window.print()
  }

  if (!isSupabaseConfigured) return <AuthScreen />

  if (authLoading) {
    return <main className="connection-state"><span className="loading-mark" /><p>Verificando sua sessão...</p></main>
  }

  if (authError && !session) {
    return <main className="connection-state"><p role="alert">Não foi possível verificar a sessão: {authError}</p><button type="button" className="primary-button" onClick={() => window.location.reload()}>Tentar novamente</button></main>
  }

  if (!session) return <AuthScreen />

  if (workspaceStatus === 'loading' || workspaceStatus === 'idle') {
    return <main className="connection-state"><span className="loading-mark" /><p>Carregando seus dados...</p></main>
  }

  if (workspaceStatus === 'error') {
    return (
      <main className="connection-state">
        <p role="alert">Não foi possível carregar os dados: {workspaceError}</p>
        <div className="connection-actions">
          <button type="button" className="primary-button" onClick={() => { setWorkspaceLoadResult(null); setWorkspaceReload((value) => value + 1) }}>Tentar novamente</button>
          <button type="button" className="ghost-button" onClick={() => { void supabase?.auth.signOut() }}>Sair</button>
        </div>
      </main>
    )
  }

  return (
    <div className="app-shell">
      <div className="app-layout">
        <aside className={`sidebar ${mobileMenuOpen ? 'sidebar-open' : ''}`}>
          <div className="brand-wrap">
            <div className="app-icon">
              <Stethoscope className="h-6 w-6" />
            </div>
            <div>
              <p className="brand-label">Fonoativa</p>
              <h1>Prontuário</h1>
            </div>
          </div>

          <nav className="sidebar-nav">
            {navigation.map(({ id, label, icon: Icon }) => {
              const active = section === id
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => navigateTo(id as Section)}
                  className={`nav-button ${active ? 'active' : ''}`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{label}</span>
                </button>
              )
            })}
          </nav>

          <div className="sidebar-card">
            <p>Hoje</p>
            <strong>{stats.today}</strong>
            <span>atendimentos agendados</span>
          </div>
        </aside>

        {mobileMenuOpen && (
          <button
            type="button"
            className="sidebar-backdrop"
            aria-label="Fechar menu"
            onClick={() => setMobileMenuOpen(false)}
          />
        )}

        <main className="main-content">
          <header className="toolbar">
            <div>
              <button
                type="button"
                className="menu-toggle"
                aria-label={mobileMenuOpen ? 'Fechar menu' : 'Abrir menu'}
                aria-expanded={mobileMenuOpen}
                onClick={() => setMobileMenuOpen((open) => !open)}
              >
                {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </button>
              <p className="eyebrow">Sistema integrado</p>
              <h2>{section === 'dashboard' ? 'Dashboard' : section === 'agenda' ? 'Agenda' : section === 'patients' ? 'Pacientes' : section === 'records' ? 'Prontuários' : section === 'activities' ? 'Atividades terapêuticas' : 'Configurações'}</h2>
            </div>

            <div className="toolbar-actions">
              <span className={`sync-indicator ${syncStatus}`} role="status" title={syncError}>
                {syncStatus === 'saving' ? 'Salvando...' : syncStatus === 'error' ? 'Falha ao salvar' : 'Sincronizado'}
              </span>
              <div className="toolbar-date">
                <CalendarDays className="h-4 w-4" />
                {formatDate(new Date().toISOString())}
              </div>
              <button
                type="button"
                className="secondary-button back-button"
                onClick={goBack}
                disabled={sectionHistory.length === 0}
              >
                <ArrowLeft className="h-4 w-4" />
                Voltar
              </button>
              <button type="button" className="ghost-button sign-out-button" onClick={() => { void supabase?.auth.signOut() }} title={`Sair de ${session.user.email ?? 'sua conta'}`}>
                <LogOut className="h-4 w-4" />
                Sair
              </button>
            </div>
          </header>

          {section === 'dashboard' && (
            <div className="stack">
              <section className="stats-grid">
                {[
                  { label: 'Atendimentos do dia', value: stats.today, tone: 'cyan' },
                  { label: 'Concluídos', value: stats.completed, tone: 'green' },
                  { label: 'Pendentes', value: stats.pending, tone: 'amber' },
                  { label: 'Próximo paciente', value: patients[0]?.name ?? 'Nenhum', tone: 'violet' },
                ].map((stat) => (
                  <div key={stat.label} className={`stat-card ${stat.tone}`}>
                    <p>{stat.label}</p>
                    <strong>{stat.value}</strong>
                  </div>
                ))}
              </section>

              <section className="content-grid">
                <div className="panel">
                  <div className="section-header">
                    <h3>Próximos atendimentos</h3>
                    <button type="button" className="link-button" onClick={() => navigateTo('agenda')}>Abrir agenda</button>
                  </div>

                  {upcomingAppointments.length === 0 ? (
                    <div className="empty-state small">
                      <p>Nenhum atendimento agendado ainda.</p>
                      <button type="button" className="primary-button small" onClick={() => navigateTo('patients')}>Cadastrar paciente</button>
                    </div>
                  ) : (
                    <div className="list-stack">
                      {upcomingAppointments.map((appointment) => {
                        const patient = patients.find((item) => item.id === appointment.patientId)
                        return (
                          <div key={appointment.id} className="schedule-row">
                            <div>
                              <strong>{patient?.name ?? 'Paciente'}</strong>
                              <span>{appointment.date} • {appointment.time}</span>
                            </div>
                            <span className={`status-badge ${getStatusClass(appointment.status)}`}>
                              {appointment.status}
                            </span>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>

                <div className="panel">
                  <h3>Atalhos</h3>
                  <div className="shortcut-list">
                    <button type="button" onClick={() => navigateTo('agenda')} className="shortcut-item cyan">
                      <span>Abrir agenda</span>
                      <ArrowRight className="h-4 w-4" />
                    </button>
                    <button type="button" onClick={() => navigateTo('patients')} className="shortcut-item green">
                      <span>Cadastrar paciente</span>
                      <Plus className="h-4 w-4" />
                    </button>
                    <button type="button" onClick={() => navigateTo('agenda')} className="shortcut-item violet">
                      <span>Iniciar atendimento</span>
                      <ClipboardList className="h-4 w-4" />
                    </button>
                    <button type="button" onClick={() => navigateTo('records')} className="shortcut-item amber">
                      <span>Consultar prontuários</span>
                      <FileText className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </section>
            </div>
          )}

          {section === 'agenda' && (
            <div className="stack">
              <section className="panel panel-strong calendar-workspace">
                <div className="calendar-layout">
                  <div className="calendar-month">
                    <header className="calendar-month-header">
                      <div>
                        <p className="eyebrow">Calendário de atendimentos</p>
                        <h3>{new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(calendarMonth)}</h3>
                      </div>
                      <div className="calendar-controls">
                        <button type="button" className="icon-button" aria-label="Mês anterior" onClick={() => {
                          const previousMonth = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1, 1)
                          setCalendarMonth(previousMonth)
                          setAgendaDate(previousMonth)
                          setAppointmentForm((current) => ({ ...current, date: dateToInput(previousMonth) }))
                          setShowAppointmentForm(false)
                        }}><ChevronLeft className="h-4 w-4" /></button>
                        <button type="button" className="icon-button" onClick={() => {
                          const now = new Date()
                          setCalendarMonth(startOfMonth(now))
                          setAgendaDate(now)
                          setAppointmentForm((current) => ({ ...current, date: dateToInput(now) }))
                          setShowAppointmentForm(false)
                        }}>Hoje</button>
                        <button type="button" className="icon-button" aria-label="Próximo mês" onClick={() => {
                          const nextMonth = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 1)
                          setCalendarMonth(nextMonth)
                          setAgendaDate(nextMonth)
                          setAppointmentForm((current) => ({ ...current, date: dateToInput(nextMonth) }))
                          setShowAppointmentForm(false)
                        }}><ChevronRight className="h-4 w-4" /></button>
                      </div>
                    </header>
                    <div className="calendar-weekdays" aria-hidden="true">
                      {['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'].map((day) => <span key={day}>{day}</span>)}
                    </div>
                    <div className="calendar-days">
                      {calendarDays.map((day) => {
                        const dayKey = dateToInput(day)
                        const isCurrentMonth = day.getMonth() === calendarMonth.getMonth()
                        const isToday = dayKey === today
                        const isSelected = dayKey === selectedDayKey
                        const dayCount = appointments.filter((appointment) => appointment.date === dayKey).length
                        return (
                          <button
                            key={dayKey}
                            type="button"
                            className={`calendar-day ${isCurrentMonth ? '' : 'outside-month'} ${isToday ? 'today' : ''} ${isSelected ? 'selected' : ''} ${dayCount ? 'has-appointments' : ''}`}
                            aria-label={`${new Intl.DateTimeFormat('pt-BR', { dateStyle: 'full' }).format(day)}${dayCount ? `, ${dayCount} atendimento(s)` : ''}`}
                            aria-pressed={isSelected}
                            onClick={() => {
                              setAgendaDate(day)
                              setCalendarMonth(startOfMonth(day))
                              setAppointmentForm((current) => ({ ...current, date: dayKey }))
                              setShowAppointmentForm(false)
                            }}
                          >
                            <span>{day.getDate()}</span>
                            {dayCount > 0 && <small>{dayCount} atend.</small>}
                            {dayCount > 0 && <i aria-hidden="true" />}
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  <aside className="selected-day-panel">
                    <header className="selected-day-header">
                      <div>
                        <p className="eyebrow">Dia selecionado</p>
                        <h3>{selectedDayLabel}</h3>
                        <span>{selectedDayAppointments.length} atendimento(s)</span>
                      </div>
                      <button
                        type="button"
                        className="primary-button small"
                        disabled={patients.length === 0}
                        onClick={() => {
                          setAppointmentForm((current) => ({
                            ...current,
                            date: selectedDayKey,
                            patientId: current.patientId || patients[0]?.id || '',
                            professional: data.settings.professionalName,
                            room: patients.find((patient) => patient.id === current.patientId)?.nextRoom || patients[0]?.nextRoom || '',
                          }))
                          setShowAppointmentForm((visible) => !visible)
                        }}
                      >
                        <CalendarPlus className="h-4 w-4" />
                        Agendar
                      </button>
                    </header>

                    {showAppointmentForm && patients.length > 0 && (
                      <form className="patient-form appointment-form" onSubmit={handleCreateAppointment}>
                        <label>
                          Paciente
                          <select value={appointmentForm.patientId} onChange={(event) => {
                            const patient = patients.find((item) => item.id === event.target.value)
                            setAppointmentForm((current) => ({ ...current, patientId: event.target.value, room: patient?.nextRoom ?? current.room }))
                          }} required>
                            {patients.map((patient) => <option key={patient.id} value={patient.id}>{patient.name}</option>)}
                          </select>
                        </label>
                        <label>Horário<input type="time" value={appointmentForm.time} onChange={(event) => setAppointmentForm({ ...appointmentForm, time: event.target.value })} required /></label>
                        <label>Profissional<input value={appointmentForm.professional} onChange={(event) => setAppointmentForm({ ...appointmentForm, professional: event.target.value })} required /></label>
                        <label>Sala<input value={appointmentForm.room} onChange={(event) => setAppointmentForm({ ...appointmentForm, room: event.target.value })} /></label>
                        <label>Observações<textarea value={appointmentForm.notes} onChange={(event) => setAppointmentForm({ ...appointmentForm, notes: event.target.value })} /></label>
                        <div className="form-actions">
                          <button type="button" className="ghost-button" onClick={() => setShowAppointmentForm(false)}>Cancelar</button>
                          <button type="submit" className="primary-button">Confirmar horário</button>
                        </div>
                      </form>
                    )}

                    {patients.length === 0 ? (
                      <div className="empty-state small">
                        <p>Cadastre um paciente antes de agendar.</p>
                        <button type="button" className="primary-button small" onClick={() => navigateTo('patients')}>Cadastrar paciente</button>
                      </div>
                    ) : selectedDayAppointments.length === 0 && !showAppointmentForm ? (
                      <div className="empty-state small"><p>Nenhum atendimento neste dia.</p></div>
                    ) : (
                      <div className="day-appointment-list">
                        {selectedDayAppointments.map((appointment) => {
                          const patient = patients.find((item) => item.id === appointment.patientId)
                          return (
                            <article key={appointment.id} className="day-appointment">
                              <time>{appointment.time}</time>
                              <div>
                                <strong>{patient?.name ?? 'Paciente removido'}</strong>
                                <span>{appointment.professional} · {appointment.room}</span>
                                {appointment.notes && <small>{appointment.notes}</small>}
                              </div>
                              <span className={`status-badge ${getStatusClass(appointment.status)}`}>{appointment.status}</span>
                            </article>
                          )
                        })}
                      </div>
                    )}
                  </aside>
                </div>
              </section>
            </div>
          )}

          {section === 'patients' && (
            <div className="stack">
              <section className="panel panel-strong">
                <div className="section-header">
                  <div className="search-wrap">
                    <Search className="search-icon" />
                    <input
                      value={patientFilter}
                      onChange={(event) => setPatientFilter(event.target.value)}
                      placeholder="Pesquisar por nome"
                    />
                  </div>

                  <button type="button" className="primary-button small" onClick={() => {
                    setPatientFormMode('create')
                    setForm(emptyForm)
                    setShowPatientForm((current) => !current)
                  }}>
                    <Plus className="h-4 w-4" />
                    Cadastrar paciente
                  </button>
                </div>

                {showPatientForm && (
                  <form onSubmit={handleSavePatient} className="patient-form">
                    <h3>{patientFormMode === 'edit' ? 'Editar paciente' : 'Cadastrar paciente'}</h3>
                    <div className="form-grid">
                      <label>
                        Nome completo
                        <input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required />
                      </label>
                      <label>
                        Data de nascimento
                        <input type="date" value={form.dob} onChange={(event) => setForm({ ...form, dob: event.target.value })} />
                      </label>
                      <label>
                        Telefone
                        <input value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} />
                      </label>
                      <label>
                        Responsável legal
                        <input value={form.legalResponsible} onChange={(event) => setForm({ ...form, legalResponsible: event.target.value })} />
                      </label>
                      <label>
                        Encaminhamento
                        <input value={form.referral} onChange={(event) => setForm({ ...form, referral: event.target.value })} />
                      </label>
                      <label>
                        Próxima sala
                        <input value={form.nextRoom} onChange={(event) => setForm({ ...form, nextRoom: event.target.value })} />
                      </label>
                      <label>
                        Status
                        <select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value as PatientStatus })}>
                          <option value="Ativo">Ativo</option>
                          <option value="Em espera">Em espera</option>
                          <option value="Arquivado">Arquivado</option>
                        </select>
                      </label>
                      <label className="full-width">
                        Informações administrativas
                        <textarea value={form.administrativeInfo} onChange={(event) => setForm({ ...form, administrativeInfo: event.target.value })} />
                      </label>
                      <label className="full-width">
                        Queixa principal
                        <textarea value={form.mainComplaint} onChange={(event) => setForm({ ...form, mainComplaint: event.target.value })} placeholder="Descreva a queixa relatada para este paciente" />
                      </label>
                      <label className="full-width">
                        Atividade realizada
                        <textarea value={form.activitiesPerformed} onChange={(event) => setForm({ ...form, activitiesPerformed: event.target.value })} placeholder="Ex.: jogo da memória, atividades de articulação..." />
                      </label>
                    </div>

                    <div className="form-actions">
                      <button type="button" className="ghost-button" onClick={() => { setShowPatientForm(false); setPatientFormMode('create') }}>Cancelar</button>
                      <button type="submit" className="primary-button">{patientFormMode === 'edit' ? 'Salvar alterações' : 'Salvar paciente'}</button>
                    </div>
                  </form>
                )}

                {patients.length === 0 && !showPatientForm ? (
                  <div className="empty-state">
                    <p>Ainda não há pacientes cadastrados. Comece pelo formulário acima.</p>
                  </div>
                ) : (
                  <>
                    <div className="table-shell">
                      <table className="patient-table">
                        <thead>
                          <tr>
                            <th>Paciente</th>
                            <th>Nascimento</th>
                            <th>Idade</th>
                            <th>Atendimentos</th>
                            <th>Status</th>
                            <th />
                          </tr>
                        </thead>
                        <tbody>
                          {filteredPatients.map((patient) => (
                            <tr key={patient.id}>
                              <td>
                                <div>
                                  <strong className="patient-name">{patient.name}</strong>
                                  <span>{patient.phone || 'Sem telefone'}</span>
                                </div>
                              </td>
                              <td>{formatDate(patient.dob)}</td>
                              <td>{ageFromBirthDate(patient.dob)}</td>
                              <td>{appointments.filter((appointment) => appointment.patientId === patient.id).length}</td>
                              <td>
                                <span className="status-pill status-active">{patient.status}</span>
                              </td>
                              <td className="action-cell">
                                <button type="button" className="table-button" onClick={() => setSelectedPatientId(patient.id)}>
                                  Ficha
                                </button>
                                <button type="button" className="table-button edit-patient-button" onClick={() => beginPatientEdit(patient)}>
                                  <Pencil className="h-3.5 w-3.5" />
                                  Editar
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {selectedPatient && (
                      <div className="detail-layout">
                        <div className="panel detail-panel">
                          <div className="section-header detail-head">
                            <div>
                              <p className="eyebrow small">Paciente selecionado</p>
                              <h3>{selectedPatient.name}</h3>
                            </div>
                            <button type="button" className="table-button detail-edit-button" onClick={() => beginPatientEdit(selectedPatient)}>
                              <Pencil className="h-3.5 w-3.5" />
                              Editar paciente
                            </button>
                          </div>

                          <div className="tab-row">
                            {[
                              { key: 'resumo', label: 'Resumo' },
                              { key: 'anamnese', label: 'Anamnese' },
                              { key: 'objetivos', label: 'Objetivos' },
                              { key: 'atividades', label: 'Atividades' },
                              { key: 'historico', label: 'Histórico' },
                              { key: 'prontuario', label: 'Prontuário' },
                            ].map((tab) => (
                              <button
                                key={tab.key}
                                type="button"
                                onClick={() => setSelectedTab(tab.key as DetailTab)}
                                className={`tab-button ${selectedTab === tab.key ? 'active' : ''}`}
                              >
                                {tab.label}
                              </button>
                            ))}
                          </div>

                          {selectedTab === 'resumo' && (
                            <div className="detail-grid">
                              <div className="info-block">
                                <p>Dados principais</p>
                                <ul>
                                  <li><strong>Nascimento:</strong> {formatDate(selectedPatient.dob)}</li>
                                  <li><strong>Idade:</strong> {ageFromBirthDate(selectedPatient.dob)}</li>
                                  <li><strong>Telefone:</strong> {selectedPatient.phone || '—'}</li>
                                  <li><strong>Responsável:</strong> {selectedPatient.legalResponsible || '—'}</li>
                                </ul>
                              </div>
                              <div className="info-block">
                                <p>Atendimento</p>
                                <ul>
                                  <li><strong>Atendimentos marcados:</strong> {patientAppointments.length}</li>
                                  <li><strong>Próximo horário:</strong> {patientAppointments[0] ? `${formatDate(patientAppointments[0].date)} às ${patientAppointments[0].time}` : '—'}</li>
                                  <li><strong>Sala:</strong> {selectedPatient.nextRoom || '—'}</li>
                                  <li><strong>Encaminhamento:</strong> {selectedPatient.referral || '—'}</li>
                                </ul>
                              </div>
                            </div>
                          )}

                          {selectedTab === 'anamnese' && (
                            <div className="info-block text-block">
                              <p>Queixa principal</p>
                              <span>{selectedPatient.anamnesis.queixaPrincipal || 'Nenhuma informação registrada ainda.'}</span>
                            </div>
                          )}

                          {selectedTab === 'atividades' && (
                            <div className="info-block text-block">
                              <p>Atividades realizadas</p>
                              <span>{selectedPatient.activitiesPerformed || 'Nenhuma atividade registrada ainda.'}</span>
                            </div>
                          )}

                          {selectedTab === 'historico' && (
                            <div className="list-stack">
                              {patientAppointments.length === 0 ? (
                                <div className="empty-state small no-pad">
                                  <p>Nenhum atendimento registrado para este paciente.</p>
                                </div>
                              ) : (
                                patientAppointments.map((appointment) => (
                                  <div key={appointment.id} className="schedule-row history-row">
                                    <div>
                                      <strong>{appointment.date}</strong>
                                      <span>{appointment.time} • {appointment.professional}</span>
                                    </div>
                                    <span className={`status-badge ${getStatusClass(appointment.status)}`}>{appointment.status}</span>
                                  </div>
                                ))
                              )}
                            </div>
                          )}
                        </div>

                        <div className="side-stack">
                          <div className="panel compact-panel">
                            <h4>Atendimentos</h4>
                            {patientAppointments.length === 0 ? (
                              <div className="empty-state small no-pad">
                                <p>Sem agendamentos.</p>
                              </div>
                            ) : (
                              <div className="mini-list">
                                {patientAppointments.map((appointment) => (
                                  <button
                                    key={appointment.id}
                                    type="button"
                                    onClick={() => setSelectedAppointmentId(appointment.id)}
                                    className={`mini-card ${selectedAppointmentId === appointment.id ? 'selected' : ''}`}
                                  >
                                    <div className="mini-card-head">
                                      <strong>{appointment.time}</strong>
                                      <span className={`status-badge ${getStatusClass(appointment.status)}`}>{appointment.status}</span>
                                    </div>
                                    <small>{appointment.date}</small>
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>

                          <div className="panel compact-panel">
                            <h4>Evolução clínica</h4>
                            <div className="info-block text-block">
                              <span>{selectedAppointment?.date ? `${selectedAppointment.date} • ${selectedAppointment.time}` : 'Ainda não há evolução'}</span>
                              <p>{selectedAppointment ? 'Registro disponível após a criação da evolução.' : 'Nenhuma evolução registrada.'}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </section>
            </div>
          )}

          {section === 'records' && (
            <div id="printable-records" className="panel panel-strong print-area">
              <div className="print-heading">
                <p>{data.settings.clinicName}</p>
                <h1>Prontuários de pacientes</h1>
                <span>Emitido em {formatDate(new Date().toISOString())} • {patients.length} paciente(s)</span>
              </div>
              <div className="section-header no-print">
                <h3>Prontuários</h3>
                <div className="record-actions">
                  <button type="button" className="secondary-button" onClick={exportPatients} disabled={patients.length === 0}>
                    <FileSpreadsheet className="h-4 w-4" />
                    Exportar Excel (.xlsx)
                  </button>
                  <button type="button" className="primary-button small" onClick={printRecords} disabled={patients.length === 0}>
                    <Printer className="h-4 w-4" />
                    Imprimir
                  </button>
                </div>
              </div>

              {patients.length === 0 ? (
                <div className="empty-state">
                  <p>Não há prontuários para visualizar até o primeiro cadastro.</p>
                        <button type="button" className="primary-button small" onClick={() => navigateTo('patients')}>Cadastrar paciente</button>
                </div>
              ) : (
                <div className="record-grid">
                  {patients.map((patient) => (
                    <button
                      key={patient.id}
                      type="button"
                      onClick={() => {
                        setSelectedPatientId(patient.id)
                        setSelectedTab('prontuario')
                        navigateTo('patients')
                      }}
                      className="record-card"
                    >
                      <strong>{patient.name}</strong>
                      <span>{appointments.filter((appointment) => appointment.patientId === patient.id).length} atendimento(s) marcado(s)</span>
                      <small>{patient.referral || 'Sem encaminhamento'}</small>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {section === 'activities' && (
            <div className="panel panel-strong">
              <div className="section-header">
                <h3>Biblioteca de atividades</h3>
                <button type="button" className="primary-button small">Nova categoria</button>
              </div>

              <div className="activity-grid">
                {data.library.activities.map((activity) => (
                  <article key={activity.id} className="record-card activity-card">
                    <div className="activity-head">
                      <strong>{activity.name}</strong>
                      <ListChecks className="h-4 w-4" />
                    </div>
                    <p>{activity.objective}</p>
                    <div className="tag-row">
                      {activity.skills.map((skill) => (
                        <span key={skill}>{skill}</span>
                      ))}
                    </div>
                  </article>
                ))}
              </div>
            </div>
          )}

          {section === 'settings' && (
            <div className="panel panel-strong">
              <h3>Configurações</h3>
              <div className="settings-grid">
                {['Horários de atendimento', 'Dias de funcionamento', 'Profissionais', 'Salas', 'Encaminhamentos', 'Categorias de atividades'].map((setting) => (
                  <div key={setting} className="setting-card">
                    <strong>{setting}</strong>
                    <span>Configuração persistida no sistema.</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <footer className="app-footer">
            Todos os direitos reservados Eduardo Cesar Gonçalves 2026
          </footer>
        </main>
      </div>
    </div>
  )
}

export default App
