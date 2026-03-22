import type { ComponentType } from 'react'

export interface TabDefinition {
  id: string
  label: string
  icon?: string
  component: ComponentType
}

export const tabs: TabDefinition[] = []

export function registerTab(tab: TabDefinition) {
  tabs.push(tab)
}
