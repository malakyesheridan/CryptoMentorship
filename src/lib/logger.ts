type LogLevel = 'debug' | 'info' | 'warn' | 'error'

class Logger {
  private isDevelopment = process.env.NODE_ENV === 'development'
  private logLevel: LogLevel = (process.env.LOG_LEVEL as LogLevel) || 'info'

  private shouldLog(level: LogLevel): boolean {
    const levels: LogLevel[] = ['debug', 'info', 'warn', 'error']
    return levels.indexOf(level) >= levels.indexOf(this.logLevel)
  }

  private maskPII(data: unknown): unknown {
    if (typeof data !== 'object' || data === null) return data

    const sensitive = [
      'password', 'secret', 'token', 'email', 'userId', 'userEmail',
      'access_token', 'refresh_token', 'apiKey', 'api_key', 'clientSecret',
      'databaseUrl', 'connectionString'
    ]
    const masked = { ...data as Record<string, unknown> }

    for (const key of Object.keys(masked)) {
      if (sensitive.some(s => key.toLowerCase().includes(s))) {
        masked[key] = '[REDACTED]'
      } else if (typeof masked[key] === 'object') {
        masked[key] = this.maskPII(masked[key])
      }
    }

    return masked
  }

  debug(message: string, context?: Record<string, unknown>) {
    if (!this.shouldLog('debug')) return
    const data = this.isDevelopment ? context : this.maskPII(context)
    if (data && Object.keys(data).length > 0) {
      console.debug(`[DEBUG] ${message}`, data)
    } else {
      console.debug(`[DEBUG] ${message}`)
    }
  }

  info(message: string, context?: Record<string, unknown>) {
    if (!this.shouldLog('info')) return
    const data = this.isDevelopment ? context : this.maskPII(context)
    if (data && Object.keys(data).length > 0) {
      console.info(`[INFO] ${message}`, data)
    } else {
      console.info(`[INFO] ${message}`)
    }
  }

  warn(message: string, context?: Record<string, unknown>) {
    if (!this.shouldLog('warn')) return
    const data = this.isDevelopment ? context : this.maskPII(context)
    if (data && Object.keys(data).length > 0) {
      console.warn(`[WARN] ${message}`, data)
    } else {
      console.warn(`[WARN] ${message}`)
    }
  }

  error(message: string, error?: Error, context?: Record<string, unknown>) {
    if (!this.shouldLog('error')) return
    const data = this.isDevelopment ? context : this.maskPII(context)
    const errorInfo = error 
      ? { message: error.message, stack: this.isDevelopment ? error.stack : '[REDACTED]' }
      : null
    
    if (errorInfo || (data && Object.keys(data).length > 0)) {
      console.error(`[ERROR] ${message}`, errorInfo, data)
    } else {
      console.error(`[ERROR] ${message}`)
    }
  }
}

export const logger = new Logger()

