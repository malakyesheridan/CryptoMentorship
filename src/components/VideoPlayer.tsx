'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { Play, Pause, Volume2, VolumeX, Maximize, Minimize, RotateCcw, SkipBack, SkipForward, PictureInPicture2 } from 'lucide-react'

interface VideoPlayerProps {
  src: string
  title?: string
  poster?: string
  onTimeUpdate?: (currentTime: number, duration: number) => void
  onEnded?: () => void
  className?: string
}

const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 2]

export default function VideoPlayer({
  src,
  title,
  poster,
  onTimeUpdate,
  onEnded,
  className = ''
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const progressRef = useRef<HTMLDivElement>(null)
  const debounceRef = useRef<NodeJS.Timeout>()

  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolume] = useState(1)
  const [isMuted, setIsMuted] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [showControls, setShowControls] = useState(true)
  const [isLoading, setIsLoading] = useState(true)
  const [isBuffering, setIsBuffering] = useState(false)
  const [hasStartedPlaying, setHasStartedPlaying] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [shouldLoadVideo, setShouldLoadVideo] = useState(false)
  const [playbackRate, setPlaybackRate] = useState(1)
  const [showSpeedMenu, setShowSpeedMenu] = useState(false)
  const [bufferedEnd, setBufferedEnd] = useState(0)
  const [hoverTime, setHoverTime] = useState<number | null>(null)
  const [hoverX, setHoverX] = useState(0)

  const formatTime = (time: number) => {
    if (!isFinite(time) || isNaN(time)) return '0:00'
    const hours = Math.floor(time / 3600)
    const minutes = Math.floor((time % 3600) / 60)
    const seconds = Math.floor(time % 60)
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
    }
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }

  const togglePlay = useCallback(() => {
    if (videoRef.current) {
      if (!shouldLoadVideo) {
        setShouldLoadVideo(true)
        setTimeout(() => {
          if (videoRef.current && !videoRef.current.src) {
            videoRef.current.src = src
            videoRef.current.load()
          }
          videoRef.current?.play()
        }, 0)
        return
      }

      if (isPlaying) {
        videoRef.current.pause()
      } else {
        videoRef.current.play()
      }
    }
  }, [isPlaying, shouldLoadVideo, src])

  const handleSeek = useCallback((value: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = value
      setCurrentTime(value)
    }
  }, [])

  const handleVolumeChange = useCallback((value: number) => {
    setVolume(value)
    setIsMuted(value === 0)
    if (videoRef.current) {
      videoRef.current.volume = value
    }
  }, [])

  const toggleMute = useCallback(() => {
    if (videoRef.current) {
      if (isMuted) {
        videoRef.current.volume = volume || 0.5
        setIsMuted(false)
      } else {
        videoRef.current.volume = 0
        setIsMuted(true)
      }
    }
  }, [isMuted, volume])

  const toggleFullscreen = useCallback(() => {
    if (typeof document === 'undefined') return
    if (containerRef.current) {
      if (!isFullscreen) {
        containerRef.current.requestFullscreen?.()
        setIsFullscreen(true)
      } else {
        document.exitFullscreen?.()
        setIsFullscreen(false)
      }
    }
  }, [isFullscreen])

  const restart = useCallback(() => {
    if (videoRef.current) {
      videoRef.current.currentTime = 0
      setCurrentTime(0)
    }
  }, [])

  const skip = useCallback((seconds: number) => {
    if (videoRef.current) {
      const newTime = Math.max(0, Math.min(videoRef.current.currentTime + seconds, duration))
      videoRef.current.currentTime = newTime
      setCurrentTime(newTime)
    }
  }, [duration])

  const changeSpeed = useCallback((speed: number) => {
    if (videoRef.current) {
      videoRef.current.playbackRate = speed
      setPlaybackRate(speed)
      setShowSpeedMenu(false)
    }
  }, [])

  const cycleSpeed = useCallback((direction: 1 | -1) => {
    const currentIndex = SPEEDS.indexOf(playbackRate)
    const nextIndex = Math.max(0, Math.min(SPEEDS.length - 1, currentIndex + direction))
    changeSpeed(SPEEDS[nextIndex])
  }, [playbackRate, changeSpeed])

  const togglePiP = useCallback(async () => {
    if (!videoRef.current) return
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture()
      } else {
        await videoRef.current.requestPictureInPicture()
      }
    } catch {
      // PiP not supported or failed
    }
  }, [])

  // Progress bar click handler
  const handleProgressClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!progressRef.current || !duration) return
    const rect = progressRef.current.getBoundingClientRect()
    const percent = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
    handleSeek(percent * duration)
  }, [duration, handleSeek])

  // Progress bar hover
  const handleProgressHover = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!progressRef.current || !duration) return
    const rect = progressRef.current.getBoundingClientRect()
    const percent = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
    setHoverTime(percent * duration)
    setHoverX(e.clientX - rect.left)
  }, [duration])

  // Event handlers
  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    const onLoadedMetadata = () => {
      setDuration(video.duration)
      setIsLoading(false)
    }
    const onCanPlay = () => setIsLoading(false)
    const onPlay = () => {
      setIsPlaying(true)
      setIsLoading(false)
      setIsBuffering(false)
      setHasStartedPlaying(true)
    }
    const onPause = () => setIsPlaying(false)
    const onLoadStart = () => setIsLoading(true)
    const onWaiting = () => setIsBuffering(true)
    const onPlaying = () => setIsBuffering(false)
    const handleTimeUpdateEvent = () => {
      setCurrentTime(video.currentTime)
      onTimeUpdate?.(video.currentTime, video.duration)
      // Update buffered range
      if (video.buffered.length > 0) {
        setBufferedEnd(video.buffered.end(video.buffered.length - 1))
      }
    }
    const onEnded2 = () => {
      setIsPlaying(false)
      onEnded?.()
    }
    const onVolumeChange = () => {
      setVolume(video.volume)
      setIsMuted(video.muted)
    }
    const onError = () => {
      setIsLoading(false)
      if (video.error) {
        switch (video.error.code) {
          case video.error.MEDIA_ERR_ABORTED:
            setError('Video loading was aborted')
            break
          case video.error.MEDIA_ERR_NETWORK:
            setError('Network error while loading video')
            break
          case video.error.MEDIA_ERR_DECODE:
            setError('Video decoding error')
            break
          case video.error.MEDIA_ERR_SRC_NOT_SUPPORTED:
            setError('Video format not supported or file not found')
            break
          default:
            setError('Video failed to load. Please check the video URL.')
        }
      } else {
        setError('Video failed to load. Please check the video URL.')
      }
    }
    const onFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement)
    }

    video.addEventListener('loadstart', onLoadStart)
    video.addEventListener('loadedmetadata', onLoadedMetadata)
    video.addEventListener('canplay', onCanPlay)
    video.addEventListener('play', onPlay)
    video.addEventListener('pause', onPause)
    video.addEventListener('waiting', onWaiting)
    video.addEventListener('playing', onPlaying)
    video.addEventListener('timeupdate', handleTimeUpdateEvent)
    video.addEventListener('ended', onEnded2)
    video.addEventListener('volumechange', onVolumeChange)
    video.addEventListener('error', onError)
    document.addEventListener('fullscreenchange', onFullscreenChange)

    return () => {
      video.removeEventListener('loadstart', onLoadStart)
      video.removeEventListener('loadedmetadata', onLoadedMetadata)
      video.removeEventListener('canplay', onCanPlay)
      video.removeEventListener('play', onPlay)
      video.removeEventListener('pause', onPause)
      video.removeEventListener('waiting', onWaiting)
      video.removeEventListener('playing', onPlaying)
      video.removeEventListener('timeupdate', handleTimeUpdateEvent)
      video.removeEventListener('ended', onEnded2)
      video.removeEventListener('volumechange', onVolumeChange)
      video.removeEventListener('error', onError)
      document.removeEventListener('fullscreenchange', onFullscreenChange)
    }
  }, [onTimeUpdate, onEnded])

  // Fallback: Hide loading spinner after timeout
  useEffect(() => {
    if (typeof window === 'undefined') return
    const timeout = setTimeout(() => {
      if (isLoading) setIsLoading(false)
    }, 5000)
    return () => clearTimeout(timeout)
  }, [isLoading])

  // Keyboard controls
  useEffect(() => {
    if (typeof window === 'undefined') return

    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement
      const isVideoPlayer = target?.closest('[data-video-player]')
      const isInput = target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA'
      if (!isVideoPlayer || isInput) return

      switch (event.code) {
        case 'Space':
          event.preventDefault()
          togglePlay()
          break
        case 'ArrowLeft':
          event.preventDefault()
          skip(-5)
          break
        case 'ArrowRight':
          event.preventDefault()
          skip(5)
          break
        case 'ArrowUp':
          event.preventDefault()
          handleVolumeChange(Math.min(1, (isMuted ? 0 : volume) + 0.1))
          break
        case 'ArrowDown':
          event.preventDefault()
          handleVolumeChange(Math.max(0, (isMuted ? 0 : volume) - 0.1))
          break
        case 'KeyM':
          event.preventDefault()
          toggleMute()
          break
        case 'KeyF':
          event.preventDefault()
          toggleFullscreen()
          break
        case 'Period':
          if (event.shiftKey) { // > key
            event.preventDefault()
            cycleSpeed(1)
          }
          break
        case 'Comma':
          if (event.shiftKey) { // < key
            event.preventDefault()
            cycleSpeed(-1)
          }
          break
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [togglePlay, skip, handleVolumeChange, toggleMute, toggleFullscreen, cycleSpeed, volume, isMuted])

  // Hide controls after inactivity
  useEffect(() => {
    if (typeof window === 'undefined') return
    let timeout: NodeJS.Timeout
    const resetTimeout = () => {
      clearTimeout(timeout)
      setShowControls(true)
      timeout = setTimeout(() => {
        if (isPlaying) setShowControls(false)
      }, 3000)
    }
    if (isPlaying) resetTimeout()
    return () => clearTimeout(timeout)
  }, [isPlaying])

  // Close speed menu on outside click
  useEffect(() => {
    if (!showSpeedMenu) return
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (!target.closest('[data-speed-menu]')) {
        setShowSpeedMenu(false)
      }
    }
    document.addEventListener('click', handler)
    return () => document.removeEventListener('click', handler)
  }, [showSpeedMenu])

  const progressPercent = duration ? (currentTime / duration) * 100 : 0
  const bufferedPercent = duration ? (bufferedEnd / duration) * 100 : 0
  const pipSupported = typeof document !== 'undefined' && document.pictureInPictureEnabled

  return (
    <div
      ref={containerRef}
      data-video-player
      tabIndex={0}
      className={`relative bg-black rounded-xl overflow-hidden shadow-2xl group outline-none ${className}`}
      onMouseMove={() => setShowControls(true)}
      onMouseLeave={() => {
        if (isPlaying) setShowControls(false)
        setHoverTime(null)
      }}
      onClick={(e) => {
        if (typeof window === 'undefined') return
        const target = e.target as HTMLElement
        const isControl = target.closest('button') || target.closest('[data-progress]') || target.closest('[data-speed-menu]') || target.closest('[data-volume]')
        if (!isControl) togglePlay()
      }}
    >
      {/* Video Element */}
      <video
        ref={videoRef}
        src={shouldLoadVideo ? src : undefined}
        poster={poster}
        className="w-full h-full"
        preload="none"
        playsInline
      />

      {/* Error Overlay */}
      {error && (
        <div className="absolute inset-0 bg-black/90 flex items-center justify-center backdrop-blur-sm">
          <div className="flex flex-col items-center space-y-4 text-center px-4">
            <div className="w-12 h-12 border-2 border-red-500 rounded-full flex items-center justify-center">
              <span className="text-red-500 text-2xl">!</span>
            </div>
            <div>
              <p className="text-white font-medium text-lg mb-2">Video Error</p>
              <p className="text-white/80 text-sm">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Initial Loading Overlay */}
      {!error && isLoading && !hasStartedPlaying && (
        <div className="absolute inset-0 bg-black/80 flex items-center justify-center backdrop-blur-sm">
          <div className="flex flex-col items-center space-y-4">
            <div className="w-12 h-12 border-3 border-white/30 border-t-white rounded-full animate-spin" />
            <p className="text-white font-medium">Loading video...</p>
          </div>
        </div>
      )}

      {/* Buffering Spinner (during playback) */}
      {!error && isBuffering && hasStartedPlaying && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-10 h-10 border-3 border-white/30 border-t-white rounded-full animate-spin" />
        </div>
      )}

      {/* Controls Overlay */}
      {showControls && (
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent">
          {/* Top Controls */}
          <div className="absolute top-4 left-4 right-4 flex justify-between items-center">
            {title && (
              <h3 className="text-white font-semibold text-lg drop-shadow-lg truncate mr-4">{title}</h3>
            )}
          </div>

          {/* Center Play Button */}
          {!isPlaying && (
            <div className="absolute inset-0 flex items-center justify-center">
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  togglePlay()
                }}
                className="w-20 h-20 rounded-full bg-white/20 hover:bg-white/30 text-white flex items-center justify-center backdrop-blur-sm transition-all duration-200 hover:scale-105"
              >
                <Play className="w-10 h-10 ml-1" />
              </button>
            </div>
          )}

          {/* Bottom Controls */}
          <div className="absolute bottom-4 left-4 right-4 space-y-3">
            {/* Progress Bar */}
            <div className="space-y-1">
              <div
                ref={progressRef}
                data-progress
                className="relative h-2 bg-white/20 rounded-full cursor-pointer group/progress"
                onClick={(e) => {
                  e.stopPropagation()
                  handleProgressClick(e)
                }}
                onMouseMove={(e) => {
                  e.stopPropagation()
                  handleProgressHover(e)
                }}
                onMouseLeave={() => setHoverTime(null)}
              >
                {/* Buffered */}
                <div
                  className="absolute top-0 left-0 h-full bg-white/20 rounded-full"
                  style={{ width: `${bufferedPercent}%` }}
                />
                {/* Played */}
                <div
                  className="absolute top-0 left-0 h-full bg-white rounded-full transition-[width] duration-75"
                  style={{ width: `${progressPercent}%` }}
                />
                {/* Scrubber dot */}
                <div
                  className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-white rounded-full shadow-md opacity-0 group-hover/progress:opacity-100 transition-opacity"
                  style={{ left: `calc(${progressPercent}% - 8px)` }}
                />
                {/* Hover time tooltip */}
                {hoverTime !== null && (
                  <div
                    className="absolute -top-8 -translate-x-1/2 bg-black/90 text-white text-xs px-2 py-1 rounded pointer-events-none"
                    style={{ left: `${hoverX}px` }}
                  >
                    {formatTime(hoverTime)}
                  </div>
                )}
              </div>
              <div className="flex justify-between text-sm text-white/90 font-medium">
                <span>{formatTime(currentTime)}</span>
                <span>{formatTime(duration)}</span>
              </div>
            </div>

            {/* Control Buttons */}
            <div className="flex items-center justify-between bg-black/20 backdrop-blur-md rounded-lg px-3 py-1.5">
              <div className="flex items-center space-x-1">
                {/* Play/Pause */}
                <button
                  onClick={(e) => { e.stopPropagation(); togglePlay() }}
                  className="text-white hover:bg-white/20 p-2.5 rounded-lg transition-colors"
                  title={isPlaying ? 'Pause (Space)' : 'Play (Space)'}
                >
                  {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                </button>

                {/* Skip Back 10s */}
                <button
                  onClick={(e) => { e.stopPropagation(); skip(-10) }}
                  className="text-white hover:bg-white/20 p-2 rounded-lg transition-colors"
                  title="Back 10s (←)"
                >
                  <SkipBack className="w-4 h-4" />
                </button>

                {/* Skip Forward 10s */}
                <button
                  onClick={(e) => { e.stopPropagation(); skip(10) }}
                  className="text-white hover:bg-white/20 p-2 rounded-lg transition-colors"
                  title="Forward 10s (→)"
                >
                  <SkipForward className="w-4 h-4" />
                </button>

                {/* Restart */}
                <button
                  onClick={(e) => { e.stopPropagation(); restart() }}
                  className="text-white hover:bg-white/20 p-2 rounded-lg transition-colors"
                  title="Restart"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>

                {/* Volume */}
                <div className="flex items-center space-x-2 bg-white/10 rounded-lg px-2.5 py-1.5 ml-1" data-volume>
                  <button
                    onClick={(e) => { e.stopPropagation(); toggleMute() }}
                    className="text-white hover:text-white/80 transition-colors"
                    title="Mute (M)"
                  >
                    {isMuted || volume === 0 ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                  </button>
                  <div className="w-20 h-1 bg-white/30 rounded-full cursor-pointer relative" onClick={(e) => {
                    e.stopPropagation()
                    const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect()
                    const percent = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
                    handleVolumeChange(percent)
                  }}>
                    <div className="h-full bg-white rounded-full" style={{ width: `${(isMuted ? 0 : volume) * 100}%` }} />
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-1">
                {/* Speed Control */}
                <div className="relative" data-speed-menu>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      setShowSpeedMenu(!showSpeedMenu)
                    }}
                    className="text-white hover:bg-white/20 px-2.5 py-1.5 rounded-lg transition-colors text-sm font-medium"
                    title="Playback Speed"
                  >
                    {playbackRate === 1 ? '1x' : `${playbackRate}x`}
                  </button>
                  {showSpeedMenu && (
                    <div className="absolute bottom-full right-0 mb-2 bg-black/95 backdrop-blur-md rounded-lg overflow-hidden shadow-xl border border-white/10 min-w-[100px]">
                      {SPEEDS.map((speed) => (
                        <button
                          key={speed}
                          onClick={(e) => {
                            e.stopPropagation()
                            changeSpeed(speed)
                          }}
                          className={`w-full text-left px-4 py-2 text-sm transition-colors ${
                            speed === playbackRate
                              ? 'text-yellow-400 bg-white/10'
                              : 'text-white hover:bg-white/10'
                          }`}
                        >
                          {speed}x
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Picture-in-Picture */}
                {pipSupported && (
                  <button
                    onClick={(e) => { e.stopPropagation(); togglePiP() }}
                    className="text-white hover:bg-white/20 p-2 rounded-lg transition-colors"
                    title="Picture-in-Picture"
                  >
                    <PictureInPicture2 className="w-4 h-4" />
                  </button>
                )}

                {/* Fullscreen */}
                <button
                  onClick={(e) => { e.stopPropagation(); toggleFullscreen() }}
                  className="text-white hover:bg-white/20 p-2.5 rounded-lg transition-colors"
                  title="Fullscreen (F)"
                >
                  {isFullscreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
