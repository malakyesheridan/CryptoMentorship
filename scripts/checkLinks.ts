#!/usr/bin/env ts-node

const fs = require('fs')
const path = require('path')
const { spawn } = require('child_process')

interface LinkCheckResult {
  url: string
  status: number
  error?: string
}

interface PageInfo {
  path: string
  links: string[]
}

class LinkChecker {
  private baseUrl: string
  private devServer: any
  private results: LinkCheckResult[] = []

  constructor(baseUrl: string = 'http://localhost:3000') {
    this.baseUrl = baseUrl
  }

  async startDevServer(): Promise<void> {
    return new Promise((resolve, reject) => {
      console.log('🚀 Starting dev server...')
      this.devServer = spawn('npm', ['run', 'dev'], {
        stdio: 'pipe',
        shell: true
      })

      let output = ''
      this.devServer.stdout.on('data', (data: Buffer) => {
        output += data.toString()
        if (output.includes('Ready') || output.includes('started server')) {
          console.log('✅ Dev server started')
          setTimeout(resolve, 2000) // Give it a moment to fully start
        }
      })

      this.devServer.stderr.on('data', (data: Buffer) => {
        console.error('Dev server error:', data.toString())
      })

      // Timeout after 30 seconds
      setTimeout(() => {
        if (!output.includes('Ready')) {
          reject(new Error('Dev server failed to start'))
        }
      }, 30000)
    })
  }

  async stopDevServer(): Promise<void> {
    if (this.devServer) {
      this.devServer.kill()
      console.log('🛑 Dev server stopped')
    }
  }

  async checkUrl(url: string): Promise<LinkCheckResult> {
    try {
      const response = await fetch(url, {
        method: 'HEAD',
        headers: {
          'User-Agent': 'LinkChecker/1.0'
        },
        redirect: 'follow'
      })
      
      // Treat 302 redirects to login as success for admin routes
      if (response.status === 302 && url.includes('/admin/')) {
        const location = response.headers.get('location')
        if (location && location.includes('/login')) {
          return {
            url,
            status: 200 // Treat as success
          }
        }
      }
      
      return {
        url,
        status: response.status
      }
    } catch (error) {
      return {
        url,
        status: 0,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  extractLinksFromFile(filePath: string): string[] {
    try {
      const content = fs.readFileSync(filePath, 'utf8')
      const links: string[] = []
      
      // Match href="..." patterns
      const hrefMatches = content.match(/href=["']([^"']+)["']/g)
      if (hrefMatches) {
        hrefMatches.forEach((match: string) => {
          const url = match.match(/href=["']([^"']+)["']/)?.[1]
          if (url && this.isInternalLink(url)) {
            links.push(url)
          }
        })
      }

      // Match Link href patterns (Next.js)
      const linkMatches = content.match(/<Link[^>]*href=["']([^"']+)["']/g)
      if (linkMatches) {
        linkMatches.forEach((match: string) => {
          const url = match.match(/href=["']([^"']+)["']/)?.[1]
          if (url && this.isInternalLink(url)) {
            links.push(url)
          }
        })
      }

      return Array.from(new Set(links)) // Remove duplicates
    } catch (error) {
      console.warn(`Warning: Could not read file ${filePath}`)
      return []
    }
  }

  isInternalLink(url: string): boolean {
    // Skip external links
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return false
    }
    
    // Skip mailto and tel links
    if (url.startsWith('mailto:') || url.startsWith('tel:')) {
      return false
    }
    
    // Skip admin paths when not authenticated (they'll return 401/403)
    if (url.startsWith('/admin/')) {
      return false
    }
    
    // Skip hash links
    if (url.startsWith('#')) {
      return false
    }
    
    return true
  }

  async findPageFiles(): Promise<string[]> {
    const pageFiles: string[] = []
    
    function scanDirectory(dir: string) {
      if (!fs.existsSync(dir)) return
      
      const items = fs.readdirSync(dir, { withFileTypes: true })
      
      for (const item of items) {
        const fullPath = path.join(dir, item.name)
        
        if (item.isDirectory()) {
          // Skip node_modules and .next
          if (item.name === 'node_modules' || item.name === '.next') {
            continue
          }
          scanDirectory(fullPath)
        } else if (item.isFile() && item.name === 'page.tsx') {
          pageFiles.push(fullPath)
        }
      }
    }
    
    scanDirectory('app')
    return pageFiles
  }

  async checkAllLinks(): Promise<void> {
    console.log('🔍 Finding page files...')
    const pageFiles = await this.findPageFiles()
    
    console.log(`📄 Found ${pageFiles.length} page files`)
    
    const allLinks = new Set<string>()
    
    // Extract links from all page files
    for (const file of pageFiles) {
      const links = this.extractLinksFromFile(file)
      links.forEach(link => allLinks.add(link))
    }
    
    console.log(`🔗 Found ${allLinks.size} unique internal links`)
    
    // Check each link
    console.log('🔍 Checking links...')
    for (const link of Array.from(allLinks)) {
      const fullUrl = `${this.baseUrl}${link}`
      const result = await this.checkUrl(fullUrl)
      this.results.push(result)
      
      if (result.status >= 200 && result.status < 400) {
        console.log(`✅ ${link} - ${result.status}`)
      } else {
        console.log(`❌ ${link} - ${result.status} ${result.error || ''}`)
      }
    }
  }

  generateReport(): void {
    const total = this.results.length
    const successful = this.results.filter(r => r.status >= 200 && r.status < 400).length
    const failed = total - successful
    
    console.log('\n📊 Link Check Report')
    console.log('='.repeat(50))
    console.log(`Total links checked: ${total}`)
    console.log(`Successful: ${successful}`)
    console.log(`Failed: ${failed}`)
    
    if (failed > 0) {
      console.log('\n❌ Failed Links:')
      this.results
        .filter(r => r.status < 200 || r.status >= 400)
        .forEach(r => {
          console.log(`  ${r.url} - ${r.status} ${r.error || ''}`)
        })
    }
    
    if (failed > 0) {
      console.log('\n❌ Link check failed!')
      process.exit(1)
    } else {
      console.log('\n✅ All links are working!')
    }
  }
}

async function main() {
  const checker = new LinkChecker()
  
  try {
    await checker.startDevServer()
    await checker.checkAllLinks()
    checker.generateReport()
  } catch (error) {
    console.error('❌ Link check failed:', error)
    process.exit(1)
  } finally {
    await checker.stopDevServer()
  }
}

if (require.main === module) {
  main()
}

module.exports = { LinkChecker }
