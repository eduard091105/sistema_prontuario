import type { AppData } from '../types'
import { defaultData } from '../data/mockData'
import { supabase } from './supabase'

export const loadWorkspace = async (userId: string): Promise<AppData> => {
  if (!supabase) throw new Error('Supabase não está configurado.')

  const { data, error } = await supabase
    .from('clinic_workspaces')
    .select('data')
    .eq('user_id', userId)
    .maybeSingle()

  if (error) throw error
  return data?.data ? (data.data as AppData) : structuredClone(defaultData)
}

export const saveWorkspace = async (userId: string, workspace: AppData) => {
  if (!supabase) throw new Error('Supabase não está configurado.')

  const { error } = await supabase.from('clinic_workspaces').upsert(
    {
      user_id: userId,
      data: workspace,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id' },
  )

  if (error) throw error
}