'use server'

import { revalidateTag } from 'next/cache'

export async function revalidateDashboard(userId: string) {
  revalidateTag(`dashboard:${userId}`)
  revalidateTag(`me:activity:${userId}`)
}

export async function revalidateDashboardEpisodes() {
  revalidateTag('dashboard-daily-update')
  revalidateTag('dashboard-episodes')
}

export async function revalidateDashboardAnnouncements() {
  revalidateTag('dashboard-announcements')
}


