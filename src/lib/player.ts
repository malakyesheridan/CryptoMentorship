/**
 * Player utilities for video seeking and deep linking
 * Supports YouTube, Vimeo, and native HTML5 video elements
 */

/**
 * Convert time string to milliseconds
 * Supports formats: "HH:MM:SS", "MM:SS", "SS"
 */
export function toMs(timeStr: string): number {
  const parts = timeStr.split(':').map(part => parseInt(part, 10))
  
  if (parts.length === 3) {
    // HH:MM:SS
    const [hours, minutes, seconds] = parts
    return (hours * 3600 + minutes * 60 + seconds) * 1000
  } else if (parts.length === 2) {
    // MM:SS
    const [minutes, seconds] = parts
    return (minutes * 60 + seconds) * 1000
  } else if (parts.length === 1) {
    // SS
    const [seconds] = parts
    return seconds * 1000
  }
  
  throw new Error(`Invalid time format: ${timeStr}`)
}

/**
 * Convert milliseconds to time string
 * Returns format: "MM:SS" or "HH:MM:SS"
 */
export function msToTime(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000)
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  
  if (hours > 0) {
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
  } else {
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
  }
}

/**
 * Add time parameter to URL for deep linking
 * Supports YouTube (?t=seconds) and Vimeo (#t=seconds)
 */
export function toUrlWithT(url: string, ms: number): string {
  const seconds = Math.floor(ms / 1000)
  
  if (url.includes('youtube.com') || url.includes('youtu.be')) {
    const separator = url.includes('?') ? '&' : '?'
    return `${url}${separator}t=${seconds}`
  } else if (url.includes('vimeo.com')) {
    const separator = url.includes('#') ? '&' : '#'
    return `${url}${separator}t=${seconds}s`
  } else {
    // For native video or other players, add as hash
    return `${url}#t=${seconds}`
  }
}

/**
 * Extract time parameter from URL
 * Returns milliseconds or null if not found
 */
export function getTimeFromUrl(url: string): number | null {
  try {
    const urlObj = new URL(url)
    
    // Check for YouTube t parameter
    const youtubeT = urlObj.searchParams.get('t')
    if (youtubeT) {
      return parseInt(youtubeT, 10) * 1000
    }
    
    // Check for Vimeo t parameter in hash
    const vimeoMatch = urlObj.hash.match(/t=(\d+)s?/)
    if (vimeoMatch) {
      return parseInt(vimeoMatch[1], 10) * 1000
    }
    
    // Check for generic t parameter in hash
    const genericMatch = urlObj.hash.match(/t=(\d+)/)
    if (genericMatch) {
      return parseInt(genericMatch[1], 10) * 1000
    }
    
    return null
  } catch {
    return null
  }
}

/**
 * Seek video player to specific time
 * Works with YouTube iframe, Vimeo iframe, and HTML5 video elements
 */
export function seekPlayer(element: HTMLElement, ms: number): boolean {
  const seconds = ms / 1000
  
  // Try YouTube iframe
  if (element.tagName === 'IFRAME' && element.getAttribute('src')?.includes('youtube.com')) {
    try {
      // YouTube iframe API
      const iframe = element as HTMLIFrameElement
      iframe.contentWindow?.postMessage({
        event: 'command',
        func: 'seekTo',
        args: [seconds, true]
      }, '*')
      return true
    } catch {
      // Fallback: reload with time parameter
      const src = element.getAttribute('src')
      if (src) {
        element.setAttribute('src', toUrlWithT(src, ms))
        return true
      }
    }
  }
  
  // Try Vimeo iframe
  if (element.tagName === 'IFRAME' && element.getAttribute('src')?.includes('vimeo.com')) {
    try {
      const iframe = element as HTMLIFrameElement
      iframe.contentWindow?.postMessage({
        method: 'seekTo',
        value: seconds
      }, '*')
      return true
    } catch {
      // Fallback: reload with time parameter
      const src = element.getAttribute('src')
      if (src) {
        element.setAttribute('src', toUrlWithT(src, ms))
        return true
      }
    }
  }
  
  // Try HTML5 video element
  if (element.tagName === 'VIDEO') {
    try {
      const video = element as HTMLVideoElement
      video.currentTime = seconds
      return true
    } catch {
      return false
    }
  }
  
  return false
}

/**
 * Update URL with time parameter without page reload
 * Uses history API to update the URL
 */
export function updateUrlWithTime(ms: number): void {
  if (typeof window === 'undefined') return
  
  const seconds = Math.floor(ms / 1000)
  const url = new URL(window.location.href)
  
  // Remove existing time parameters
  url.searchParams.delete('t')
  url.hash = url.hash.replace(/[#&]t=\d+/g, '')
  
  // Add new time parameter
  url.searchParams.set('t', seconds.toString())
  
  // Update URL without reload
  window.history.replaceState({}, '', url.toString())
}

/**
 * Get current time from video player
 * Returns milliseconds or null if not available
 */
export function getCurrentTime(element: HTMLElement): number | null {
  // Try HTML5 video element
  if (element.tagName === 'VIDEO') {
    try {
      const video = element as HTMLVideoElement
      return video.currentTime * 1000
    } catch {
      return null
    }
  }
  
  // For iframe players, we can't get current time directly
  // This would require player API integration
  return null
}

/**
 * Check if player is ready for seeking
 * Returns true if player is loaded and ready
 */
export function isPlayerReady(element: HTMLElement): boolean {
  if (element.tagName === 'VIDEO') {
    const video = element as HTMLVideoElement
    return video.readyState >= 2 // HAVE_CURRENT_DATA
  }
  
  if (element.tagName === 'IFRAME') {
    // Assume iframe is ready if it's loaded
    return true
  }
  
  return false
}

/**
 * Wait for player to be ready
 * Returns a promise that resolves when player is ready
 */
export function waitForPlayerReady(element: HTMLElement): Promise<void> {
  return new Promise((resolve) => {
    if (isPlayerReady(element)) {
      resolve()
      return
    }
    
    if (element.tagName === 'VIDEO') {
      const video = element as HTMLVideoElement
      const onReady = () => {
        video.removeEventListener('canplay', onReady)
        resolve()
      }
      video.addEventListener('canplay', onReady)
    } else {
      // For iframes, assume ready after a short delay
      setTimeout(resolve, 1000)
    }
  })
}
