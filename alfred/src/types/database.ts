import type { Database } from './database.types'

export type { Database }

export type Tables = Database['public']['Tables']
export type TablesInsert = {
  [K in keyof Tables]: Tables[K]['Insert']
}
export type TablesUpdate = {
  [K in keyof Tables]: Tables[K]['Update']
}
