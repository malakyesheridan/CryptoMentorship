'use server'

import { revalidateTag } from 'next/cache'

export async function revalidateDashboard(userId: string) {
  revalidateTag(`dashboard:${userId}`)
  revalidateTag(`me:activity:${userId}`)
}


