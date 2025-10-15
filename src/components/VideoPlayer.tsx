'use client'

import { useState, useRef, useEffect } from 'react'
import { Play, Pause, Volume2, VolumeX, Maximize, RotateCcw, Settings } from 'lucide-react'

interface VideoPlayerProps {
  src: string
  title?: string
  poster?: string
  onTimeUpdate?: (currentTime: number, duration: number) => void
  onEnded?: () => void
  className?: string
}

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
  
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolume] = useState(1)
  const [isMuted, setIsMuted] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [showControls, setShowControls] = useState(true)
  const [isLoading, setIsLoading] = useState(true)
  const [hasStartedPlaying, setHasStartedPlaying] = useState(false)

  // Format time helper
  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60)
    const seconds = Math.floor(time % 60)
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }

  // Handle play/pause
  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause()
      } else {
        videoRef.current.play()
      }
    }
  }

  // Handle seek
  const handleSeek = (value: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = value
      setCurrentTime(value)
    }
  }

  // Handle volume change
  const handleVolumeChange = (value: number) => {
    setVolume(value)
    setIsMuted(value === 0)
    if (videoRef.current) {
      videoRef.current.volume = value
    }
  }

  // Toggle mute
  const toggleMute = () => {
    if (videoRef.current) {
      if (isMuted) {
        videoRef.current.volume = volume
        setIsMuted(false)
      } else {
        videoRef.current.volume = 0
        setIsMuted(true)
      }
    }
  }

  // Toggle fullscreen
  const toggleFullscreen = () => {
    // Only run in browser environment
    if (typeof document === 'undefined' || typeof window === 'undefined') return

    if (containerRef.current) {
      if (!isFullscreen) {
        if (containerRef.current.requestFullscreen) {
          containerRef.current.requestFullscreen()
          setIsFullscreen(true)
        }
      } else {
        if (document.exitFullscreen) {
          document.exitFullscreen()
          setIsFullscreen(false)
        }
      }
    }
  }

  // Restart video
  const restart = () => {
    if (videoRef.current) {
      videoRef.current.currentTime = 0
      setCurrentTime(0)
    }
  }

  // Event handlers
  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    const handleLoadedMetadata = () => {
      console.log('📹 Video metadata loaded, duration:', video.duration)
      setDuration(video.duration)
      setIsLoading(false)
    }

    const handleCanPlay = () => {
      console.log('📹 Video can play')
      setIsLoading(false)
    }

    const handleCanPlayThrough = () => {
      console.log('📹 Video can play through')
      setIsLoading(false)
    }

    const handlePlay = () => {
      console.log('📹 Video started playing')
      setIsPlaying(true)
      setIsLoading(false)
      setHasStartedPlaying(true)
    }

    const handlePause = () => {
      console.log('📹 Video paused')
      setIsPlaying(false)
    }

    const handleLoadStart = () => {
      console.log('📹 Video load started')
      setIsLoading(true)
    }

    const handleTimeUpdate = () => {
      setCurrentTime(video.currentTime)
      onTimeUpdate?.(video.currentTime, video.duration)
    }

    const handleEnded = () => {
      setIsPlaying(false)
      onEnded?.()
    }

    const handleVolumeChange = () => {
      setVolume(video.volume)
      setIsMuted(video.muted)
    }

    video.addEventListener('loadstart', handleLoadStart)
    video.addEventListener('loadedmetadata', handleLoadedMetadata)
    video.addEventListener('canplay', handleCanPlay)
    video.addEventListener('canplaythrough', handleCanPlayThrough)
    video.addEventListener('play', handlePlay)
    video.addEventListener('pause', handlePause)
    video.addEventListener('timeupdate', handleTimeUpdate)
    video.addEventListener('ended', handleEnded)
    video.addEventListener('volumechange', handleVolumeChange)

    return () => {
      video.removeEventListener('loadstart', handleLoadStart)
      video.removeEventListener('loadedmetadata', handleLoadedMetadata)
      video.removeEventListener('canplay', handleCanPlay)
      video.removeEventListener('canplaythrough', handleCanPlayThrough)
      video.removeEventListener('play', handlePlay)
      video.removeEventListener('pause', handlePause)
      video.removeEventListener('timeupdate', handleTimeUpdate)
      video.removeEventListener('ended', handleEnded)
      video.removeEventListener('volumechange', handleVolumeChange)
    }
  }, [onTimeUpdate, onEnded])

  // Fallback: Hide loading spinner after timeout
  useEffect(() => {
    // Only set timeout in browser environment
    if (typeof window === 'undefined') return

    const timeout = setTimeout(() => {
      if (isLoading) {
        console.log('📹 Fallback: Hiding loading spinner after timeout')
        setIsLoading(false)
      }
    }, 5000) // 5 second timeout

    return () => clearTimeout(timeout)
  }, [isLoading])

  // Keyboard controls
  useEffect(() => {
    // Only add keyboard listeners in browser environment
    if (typeof window === 'undefined' || typeof document === 'undefined') return

    const handleKeyDown = (event: KeyboardEvent) => {
      // Handle spacebar when video player is focused or when no input is focused
      if (event.code === 'Space') {
        const target = event.target as HTMLElement
        const isVideoPlayer = target?.closest('[data-video-player]')
        const isInput = target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA'

        if (isVideoPlayer && !isInput) {
          event.preventDefault() // Prevent page scroll
          togglePlay()
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      if (typeof document !== 'undefined') {
        document.removeEventListener('keydown', handleKeyDown)
      }
    }
  }, [isPlaying])

  // Hide controls after inactivity
  useEffect(() => {
    // Only set timeout in browser environment
    if (typeof window === 'undefined') return

    let timeout: NodeJS.Timeout
    const resetTimeout = () => {
      clearTimeout(timeout)
      setShowControls(true)
      timeout = setTimeout(() => {
        if (isPlaying) {
          setShowControls(false)
        }
      }, 3000)
    }

    if (isPlaying) {
      resetTimeout()
    }

    return () => clearTimeout(timeout)
  }, [isPlaying])

  return (
    <div
      ref={containerRef}
      data-video-player
      className={`relative bg-black rounded-xl overflow-hidden shadow-2xl group ${className}`}
      onMouseMove={() => setShowControls(true)}
      onMouseLeave={() => isPlaying && setShowControls(false)}
      onClick={(e) => {
        // Only handle click in browser environment
        if (typeof window === 'undefined') return

        // Toggle play if clicking on the video area (not on controls)
        const target = e.target as HTMLElement
        const isControl = target.closest('button') || target.closest('[role="slider"]')

        if (!isControl) {
          togglePlay()
        }
      }}
    >
      {/* Video Element */}
      <video
        ref={videoRef}
        src={src}
        poster={poster}
        className="w-full h-full"
      />

      {/* Loading Overlay */}
      {isLoading && !hasStartedPlaying && (
        <div className="absolute inset-0 bg-black/80 flex items-center justify-center backdrop-blur-sm">
          <div className="flex flex-col items-center space-y-4">
            <div className="w-12 h-12 border-3 border-white/30 border-t-white rounded-full animate-spin" />
            <p className="text-white font-medium">Loading video...</p>
          </div>
        </div>
      )}

      {/* Controls Overlay */}
      {showControls && (
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent">
          {/* Top Controls */}
          <div className="absolute top-4 left-4 right-4 flex justify-between items-center">
            {title && (
              <h3 className="text-white font-semibold text-lg drop-shadow-lg">{title}</h3>
            )}
            <button
              onClick={(e) => {
                e.stopPropagation()
                // Settings button - no action for now
              }}
              className="text-white hover:bg-white/20 p-2 rounded-lg transition-colors"
            >
              <Settings className="w-5 h-5" />
            </button>
          </div>

          {/* Center Play Button */}
          <div className="absolute inset-0 flex items-center justify-center">
            <button
              onClick={(e) => {
                e.stopPropagation()
                // Only toggle play in browser environment
                if (typeof window !== 'undefined') {
                  togglePlay()
                }
              }}
              className="w-20 h-20 rounded-full bg-white/20 hover:bg-white/30 text-white flex items-center justify-center backdrop-blur-sm transition-all duration-200 hover:scale-105"
            >
              {isPlaying ? (
                <Pause className="w-10 h-10" />
              ) : (
                <Play className="w-10 h-10 ml-1" />
              )}
            </button>
          </div>

          {/* Bottom Controls */}
          <div className="absolute bottom-4 left-4 right-4 space-y-4">
            {/* Progress Bar */}
            <div className="space-y-2">
              <div className="relative">
                <input
                  type="range"
                  min="0"
                  max={duration}
                  step="0.1"
                  value={currentTime}
                  onChange={(e) => {
                  if (typeof window !== 'undefined') {
                    handleSeek(parseFloat(e.target.value))
                  }
                }}
                  className="w-full h-2 bg-white/20 rounded-lg appearance-none cursor-pointer slider"
                  style={{
                    background: `linear-gradient(to right, #ffffff 0%, #ffffff ${(currentTime / duration) * 100}%, rgba(255,255,255,0.3) ${(currentTime / duration) * 100}%, rgba(255,255,255,0.3) 100%)`
                  }}
                />
                <div className="absolute top-0 left-0 w-full h-2 bg-white/10 rounded-lg pointer-events-none"></div>
              </div>
              <div className="flex justify-between text-sm text-white/90 font-medium">
                <span>{formatTime(currentTime)}</span>
                <span>{formatTime(duration)}</span>
              </div>
            </div>

            {/* Control Buttons */}
            <div className="flex items-center justify-between bg-black/20 backdrop-blur-md rounded-lg px-4 py-2">
              <div className="flex items-center space-x-3">
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    if (typeof window !== 'undefined') {
                      togglePlay()
                    }
                  }}
                  className="text-white hover:bg-white/20 p-3 rounded-lg transition-colors"
                >
                  {isPlaying ? (
                    <Pause className="w-6 h-6" />
                  ) : (
                    <Play className="w-6 h-6" />
                  )}
                </button>

                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    if (typeof window !== 'undefined') {
                      restart()
                    }
                  }}
                  className="text-white hover:bg-white/20 p-2 rounded-lg transition-colors"
                  title="Restart"
                >
                  <RotateCcw className="w-5 h-5" />
                </button>

                <div className="flex items-center space-x-3 bg-white/10 rounded-lg px-3 py-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      if (typeof window !== 'undefined') {
                        toggleMute()
                      }
                    }}
                    className="text-white hover:text-white/80 transition-colors"
                  >
                    {isMuted ? (
                      <VolumeX className="w-5 h-5" />
                    ) : (
                      <Volume2 className="w-5 h-5" />
                    )}
                  </button>
                  <div className="w-24">
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.1"
                      value={isMuted ? 0 : volume}
                      onChange={(e) => {
                        if (typeof window !== 'undefined') {
                          handleVolumeChange(parseFloat(e.target.value))
                        }
                      }}
                      className="w-full h-1 bg-white/30 rounded-lg appearance-none cursor-pointer slider"
                    />
                  </div>
                </div>
              </div>

              <button
                onClick={(e) => {
                  e.stopPropagation()
                  if (typeof window !== 'undefined') {
                    toggleFullscreen()
                  }
                }}
                className="text-white hover:bg-white/20 p-3 rounded-lg transition-colors"
                title="Fullscreen"
              >
                <Maximize className="w-6 h-6" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}