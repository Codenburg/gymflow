import type { Page } from '@playwright/test'

export const DEFAULT_PUBLIC_ORG_SLUG = 'gymflow-default'
export const PUBLIC_HOME = `/g/${DEFAULT_PUBLIC_ORG_SLUG}`

export function publicPath(path = ''): string {
  if (!path || path === '/') return PUBLIC_HOME
  if (path.startsWith('/?')) return `${PUBLIC_HOME}${path.slice(1)}`
  return `${PUBLIC_HOME}${path.startsWith('/') ? path : `/${path}`}`
}

export async function firstRoutineHref(page: Page): Promise<string | null> {
  return page.locator(`a[href^="${PUBLIC_HOME}/rutinas/"]`).first().getAttribute('href')
}
