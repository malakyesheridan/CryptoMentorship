'use client'

import { useState, useEffect } from 'react'
import useSWR from 'swr'

// Hook for managing bookmarks
export function useBookmarks() {
  const { data, error, mutate } = useSWR('/api/me/bookmarks', (url) =>
    fetch(url).then(res => res.json())
  )

  const bookmarks = data?.bookmarks || []
  const isLoading = !error && !data
  const isError = error

  const addBookmark = async (contentId?: string, episodeId?: string) => {
    const response = await fetch('/api/me/bookmarks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contentId, episodeId }),
    })

    if (response.ok) {
      mutate()
      return true
    }
    return false
  }

  const removeBookmark = async (contentId?: string, episodeId?: string) => {
    const params = new URLSearchParams()
    if (contentId) params.set('contentId', contentId)
    if (episodeId) params.set('episodeId', episodeId)

    const response = await fetch(`/api/me/bookmarks?${params}`, {
      method: 'DELETE',
    })

    if (response.ok) {
      mutate()
      return true
    }
    return false
  }

  const isBookmarked = (contentId?: string, episodeId?: string) => {
    return bookmarks.some((bookmark: any) => 
      (contentId && bookmark.contentId === contentId) ||
      (episodeId && bookmark.episodeId === episodeId)
    )
  }

  return {
    bookmarks,
    isLoading,
    isError,
    addBookmark,
    removeBookmark,
    isBookmarked,
    mutate,
  }
}

// Hook for managing interests
export function useInterests() {
  const { data, error, mutate } = useSWR('/api/me/interests', (url) =>
    fetch(url).then(res => res.json())
  )

  const interests = data || []
  const isLoading = !error && !data
  const isError = error

  const addInterest = async (tag: string) => {
    const response = await fetch('/api/me/interests', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tag }),
    })

    if (response.ok) {
      mutate()
      return true
    }
    return false
  }

  const removeInterest = async (tag: string) => {
    const response = await fetch(`/api/me/interests?tag=${encodeURIComponent(tag)}`, {
      method: 'DELETE',
    })

    if (response.ok) {
      mutate()
      return true
    }
    return false
  }

  const isFollowing = (tag: string) => {
    return interests.some((interest: any) => interest.tag === tag.toLowerCase())
  }

  return {
    interests,
    isLoading,
    isError,
    addInterest,
    removeInterest,
    isFollowing,
    mutate,
  }
}

// Hook for continue reading
export function useContinueReading() {
  const { data, error, mutate } = useSWR('/api/me/continue', (url) =>
    fetch(url).then(res => res.json())
  )

  const continueItems = data || []
  const isLoading = !error && !data
  const isError = error

  return {
    continueItems,
    isLoading,
    isError,
    mutate,
  }
}
