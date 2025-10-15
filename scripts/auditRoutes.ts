#!/usr/bin/env ts-node

import * as fs from 'fs'
import * as path from 'path'

interface RouteInfo {
  filePath: string
  normalizedPath: string
  dynamicSegments: string[]
  type: 'page' | 'route' | 'layout'
}

function scanDirectory(dir: string, basePath: string = ''): RouteInfo[] {
  const routes: RouteInfo[] = []
  
  if (!fs.existsSync(dir)) {
    return routes
  }
  
  const items = fs.readdirSync(dir, { withFileTypes: true })
  
  for (const item of items) {
    const fullPath = path.join(dir, item.name)
    const relativePath = path.join(basePath, item.name)
    
    if (item.isDirectory()) {
      // Skip route groups (folders wrapped in parentheses)
      if (item.name.startsWith('(') && item.name.endsWith(')')) {
        routes.push(...scanDirectory(fullPath, basePath))
      } else {
        routes.push(...scanDirectory(fullPath, relativePath))
      }
    } else if (item.isFile()) {
      const fileName = item.name
      if (fileName === 'page.tsx' || fileName === 'route.ts' || fileName === 'layout.tsx') {
        const type = fileName === 'page.tsx' ? 'page' : 
                    fileName === 'route.ts' ? 'route' : 'layout'
        
        // Parse dynamic segments from the path
        const segments = relativePath.split(path.sep)
        const dynamicSegments: string[] = []
        
        for (const segment of segments) {
          if (segment.startsWith('[') && segment.endsWith(']')) {
            const paramName = segment.slice(1, -1)
            dynamicSegments.push(paramName)
          }
        }
        
        routes.push({
          filePath: fullPath,
          normalizedPath: relativePath.replace(/\\/g, '/'),
          dynamicSegments,
          type
        })
      }
    }
  }
  
  return routes
}

function auditRoutes() {
  console.log('🔍 Auditing Next.js routes for conflicts...\n')
  
  const appDir = path.join(process.cwd(), 'app')
  const routes = scanDirectory(appDir)
  
  // Group routes by normalized path
  const pathGroups = new Map<string, RouteInfo[]>()
  
  for (const route of routes) {
    const key = route.normalizedPath
    if (!pathGroups.has(key)) {
      pathGroups.set(key, [])
    }
    pathGroups.get(key)!.push(route)
  }
  
  // Find conflicts
  const conflicts: Array<{ path: string; routes: RouteInfo[] }> = []
  const dynamicConflicts: Array<{ path: string; dynamicNames: string[] }> = []
  
  for (const [normalizedPath, routeList] of Array.from(pathGroups.entries())) {
    // Skip layout conflicts between route groups - these are valid in Next.js
    if (normalizedPath === 'layout.tsx' && routeList.length > 1) {
      continue
    }
    
    if (routeList.length > 1) {
      conflicts.push({ path: normalizedPath, routes: routeList })
    }
    
    // Check for dynamic segment name conflicts
    // Only flag conflicts if there are multiple files at the same path with different dynamic segment names
    if (routeList.length > 1) {
      const allDynamicNames = new Set<string>()
      for (const route of routeList) {
        for (const segment of route.dynamicSegments) {
          allDynamicNames.add(segment)
        }
      }
      
      if (allDynamicNames.size > 1) {
        dynamicConflicts.push({ 
          path: normalizedPath, 
          dynamicNames: Array.from(allDynamicNames) 
        })
      }
    }
  }
  
  // Report results
  console.log('📊 Route Analysis Results:\n')
  
  if (conflicts.length === 0 && dynamicConflicts.length === 0) {
    console.log('✅ No route conflicts detected!')
    return
  }
  
  if (conflicts.length > 0) {
    console.log('❌ Route Conflicts (multiple files at same path):')
    for (const conflict of conflicts) {
      console.log(`\n  Path: ${conflict.path}`)
      for (const route of conflict.routes) {
        console.log(`    - ${route.filePath} (${route.type})`)
      }
    }
  }
  
  if (dynamicConflicts.length > 0) {
    console.log('\n❌ Dynamic Segment Name Conflicts:')
    for (const conflict of dynamicConflicts) {
      console.log(`\n  Path: ${conflict.path}`)
      console.log(`    Dynamic names: ${conflict.dynamicNames.join(', ')}`)
      
      // Show the conflicting routes
      const routes = pathGroups.get(conflict.path) || []
      for (const route of routes) {
        if (route.dynamicSegments.length > 0) {
          console.log(`    - ${route.filePath}: [${route.dynamicSegments.join('], [')}]`)
        }
      }
    }
  }
  
  console.log('\n📋 All Routes Summary:')
  console.log('Path → Dynamic Segments')
  console.log('─'.repeat(50))
  
  const sortedPaths = Array.from(pathGroups.keys()).sort()
  for (const path of sortedPaths) {
    const routes = pathGroups.get(path)!
    const allDynamicNames = new Set<string>()
    for (const route of routes) {
      for (const segment of route.dynamicSegments) {
        allDynamicNames.add(segment)
      }
    }
    
    const dynamicStr = allDynamicNames.size > 0 ? 
      `[${Array.from(allDynamicNames).join('], [')}]` : 
      '(static)'
    
    const conflictMarker = routes.length > 1 ? ' ⚠️' : ''
    console.log(`${path} → ${dynamicStr}${conflictMarker}`)
  }
  
  // Exit with error if conflicts found
  if (conflicts.length > 0 || dynamicConflicts.length > 0) {
    console.log('\n❌ Route conflicts detected! Build will fail.')
    process.exit(1)
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  auditRoutes()
}

export { auditRoutes }
