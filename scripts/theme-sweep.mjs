#!/usr/bin/env node
/**
 * theme-sweep.mjs
 *
 * One-time codemod that replaces hardcoded Stewart & Co palette hex literals
 * with CSS variables, so both dark and light modes render correctly.
 *
 * Safe to run multiple times (idempotent). Excludes node_modules, .next,
 * CLAUDE.md, tokens.css, and the theme-provider itself.
 *
 *   node scripts/theme-sweep.mjs
 */
import { readFile, writeFile, readdir, stat } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

const REPLACEMENTS = [
  // Backgrounds
  { pattern: /bg-\[#0a0a0a\]/g, replacement: 'bg-[var(--bg-page)]' },
  { pattern: /bg-\[#141210\]/g, replacement: 'bg-[var(--bg-panel)]' },
  { pattern: /bg-\[#1a1815\]/g, replacement: 'bg-[var(--bg-hover)]' },
  { pattern: /bg-\[#2a2520\]/g, replacement: 'bg-[var(--bg-skeleton)]' },
  { pattern: /bg-\[#3a3530\]/g, replacement: 'bg-[var(--bg-skeleton-alt)]' },
  // Hover backgrounds
  { pattern: /hover:bg-\[#1a1815\]/g, replacement: 'hover:bg-[var(--bg-hover)]' },
  { pattern: /hover:bg-\[#2a2520\]/g, replacement: 'hover:bg-[var(--bg-skeleton)]' },
  { pattern: /hover:bg-\[#141210\]/g, replacement: 'hover:bg-[var(--bg-panel)]' },
  { pattern: /hover:bg-\[#0a0a0a\]/g, replacement: 'hover:bg-[var(--bg-page)]' },
  // Borders
  { pattern: /border-\[#2a2520\]/g, replacement: 'border-[var(--border-subtle)]' },
  { pattern: /border-\[#1a1815\]/g, replacement: 'border-[var(--bg-hover)]' },
  { pattern: /border-\[#141210\]/g, replacement: 'border-[var(--bg-panel)]' },
  { pattern: /hover:border-\[#2a2520\]/g, replacement: 'hover:border-[var(--border-subtle)]' },
  // Ring / focus
  { pattern: /ring-\[#2a2520\]/g, replacement: 'ring-[var(--border-subtle)]' },
  // Text
  { pattern: /text-\[#f5f0e8\]/g, replacement: 'text-[var(--text-strong)]' },
  { pattern: /text-\[#8a7d6b\]/g, replacement: 'text-[var(--text-muted)]' },
  // Gradients
  { pattern: /from-\[#0a0a0a\]/g, replacement: 'from-[var(--bg-page)]' },
  { pattern: /from-\[#141210\]/g, replacement: 'from-[var(--bg-panel)]' },
  { pattern: /from-\[#1a1815\]/g, replacement: 'from-[var(--bg-hover)]' },
  { pattern: /from-\[#2a2520\]/g, replacement: 'from-[var(--bg-skeleton)]' },
  { pattern: /via-\[#0a0a0a\]/g, replacement: 'via-[var(--bg-page)]' },
  { pattern: /via-\[#141210\]/g, replacement: 'via-[var(--bg-panel)]' },
  { pattern: /via-\[#1a1815\]/g, replacement: 'via-[var(--bg-hover)]' },
  { pattern: /via-\[#2a2520\]/g, replacement: 'via-[var(--bg-skeleton)]' },
  { pattern: /to-\[#0a0a0a\]/g, replacement: 'to-[var(--bg-page)]' },
  { pattern: /to-\[#141210\]/g, replacement: 'to-[var(--bg-panel)]' },
  { pattern: /to-\[#1a1815\]/g, replacement: 'to-[var(--bg-hover)]' },
  { pattern: /to-\[#2a2520\]/g, replacement: 'to-[var(--bg-skeleton)]' },
  { pattern: /group-hover:from-\[#2a2520\]/g, replacement: 'group-hover:from-[var(--bg-skeleton)]' },
  { pattern: /group-hover:to-\[#2a2520\]/g, replacement: 'group-hover:to-[var(--bg-skeleton)]' },
  // Semantic status colors (direct hex → CSS var)
  { pattern: /text-\[#c03030\]/g, replacement: 'text-[var(--danger)]' },
  { pattern: /text-\[#4a7c3f\]/g, replacement: 'text-[var(--success)]' },
  { pattern: /text-\[#c9a227\]/g, replacement: 'text-[var(--gold-400)]' },
  { pattern: /text-\[#d97706\]/g, replacement: 'text-[var(--warning)]' },
  { pattern: /bg-\[#c03030\]/g, replacement: 'bg-[var(--danger)]' },
  { pattern: /bg-\[#4a7c3f\]/g, replacement: 'bg-[var(--success)]' },
  { pattern: /bg-\[#c9a227\]/g, replacement: 'bg-[var(--gold-400)]' },
  { pattern: /border-\[#c03030\]/g, replacement: 'border-[var(--danger)]' },
  { pattern: /border-\[#4a7c3f\]/g, replacement: 'border-[var(--success)]' },
  { pattern: /border-\[#c9a227\]/g, replacement: 'border-[var(--gold-400)]' },
  // Tinted alert panel backgrounds (opacity-free variants are used as panel fills)
  { pattern: /bg-\[#2e1a1a\]/g, replacement: 'bg-[var(--bg-danger-subtle)]' },
  { pattern: /bg-\[#1a2e1a\]/g, replacement: 'bg-[var(--bg-success-subtle)]' },
  { pattern: /bg-\[#2a2418\]/g, replacement: 'bg-[var(--bg-warning-subtle)]' },
  { pattern: /bg-\[#2a2018\]/g, replacement: 'bg-[var(--bg-warning-subtle)]' },
  { pattern: /bg-\[#1a1d2e\]/g, replacement: 'bg-[var(--bg-info-subtle)]' },
  { pattern: /bg-\[#1a1e2e\]/g, replacement: 'bg-[var(--bg-info-subtle)]' },
  { pattern: /bg-\[#1a1a2e\]/g, replacement: 'bg-[var(--bg-info-subtle)]' },
  // Chart internals — Recharts SVG attrs and JS tooltip styles.
  // CSS variables do resolve in SVG presentation attributes in all modern
  // browsers, and in inline-style strings.
  { pattern: /stroke="#2a2520"/g, replacement: 'stroke="var(--border-subtle)"' },
  { pattern: /stroke="#8a7d6b"/g, replacement: 'stroke="var(--text-muted)"' },
  { pattern: /stroke="#f5f0e8"/g, replacement: 'stroke="var(--text-strong)"' },
  { pattern: /fill="#2a2520"/g, replacement: 'fill="var(--border-subtle)"' },
  { pattern: /fill="#8a7d6b"/g, replacement: 'fill="var(--text-muted)"' },
  { pattern: /fill="#f5f0e8"/g, replacement: 'fill="var(--text-strong)"' },
  { pattern: /fill="#141210"/g, replacement: 'fill="var(--bg-panel)"' },
  { pattern: /'#2a2520'/g, replacement: "'var(--border-subtle)'" },
  { pattern: /'#8a7d6b'/g, replacement: "'var(--text-muted)'" },
  { pattern: /'#f5f0e8'/g, replacement: "'var(--text-strong)'" },
  { pattern: /'#141210'/g, replacement: "'var(--bg-panel)'" },
  { pattern: /'#1a1815'/g, replacement: "'var(--bg-hover)'" },
  // NOTE: text-[#0a0a0a] is intentionally NOT replaced — it's used as the
  // inverse-text color on gold CTA buttons, which should stay dark in both
  // themes.
]

const ALLOWED_EXT = new Set(['.ts', '.tsx', '.css'])
const IGNORE_DIRS = new Set(['node_modules', '.next', 'dist', '.git', '.turbo', 'prisma'])
const IGNORE_FILES = new Set([
  path.join('src', 'styles', 'tokens.css'),
  path.join('src', 'components', 'theme-provider.tsx'),
  path.join('src', 'lib', 'chart-theme.ts'),
  path.join('src', 'lib', 'blog-html-template.ts'),
  path.join('src', 'lib', 'blog-pdf-export.ts'),
  path.join('src', 'lib', 'email-templates.ts'),
  path.join('src', 'lib', 'email.ts'),
  'CLAUDE.md',
])
const INCLUDE_ROOTS = ['app', 'src', 'components', 'pages']

async function walk(dir, results = []) {
  let entries
  try {
    entries = await readdir(dir, { withFileTypes: true })
  } catch {
    return results
  }
  for (const entry of entries) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      if (IGNORE_DIRS.has(entry.name)) continue
      await walk(full, results)
    } else if (entry.isFile()) {
      const ext = path.extname(entry.name)
      if (!ALLOWED_EXT.has(ext)) continue
      const rel = path.relative(ROOT, full)
      if (IGNORE_FILES.has(rel)) continue
      results.push(full)
    }
  }
  return results
}

async function main() {
  const allFiles = []
  for (const root of INCLUDE_ROOTS) {
    const abs = path.join(ROOT, root)
    try {
      await stat(abs)
    } catch {
      continue
    }
    await walk(abs, allFiles)
  }

  let changedFiles = 0
  let totalReplacements = 0
  const perFile = []

  for (const file of allFiles) {
    const original = await readFile(file, 'utf8')
    let updated = original
    let fileReplacements = 0
    for (const { pattern, replacement } of REPLACEMENTS) {
      const before = updated
      updated = updated.replace(pattern, replacement)
      if (before !== updated) {
        const matches = before.match(pattern)
        fileReplacements += matches ? matches.length : 0
      }
    }
    if (updated !== original) {
      await writeFile(file, updated)
      changedFiles++
      totalReplacements += fileReplacements
      perFile.push({ file: path.relative(ROOT, file), count: fileReplacements })
    }
  }

  perFile.sort((a, b) => b.count - a.count)
  console.log(`\nTheme sweep complete:`)
  console.log(`  files scanned:   ${allFiles.length}`)
  console.log(`  files changed:   ${changedFiles}`)
  console.log(`  replacements:    ${totalReplacements}`)
  if (perFile.length) {
    console.log(`\nTop files:`)
    for (const { file, count } of perFile.slice(0, 15)) {
      console.log(`  ${String(count).padStart(4)} ${file}`)
    }
  }
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
