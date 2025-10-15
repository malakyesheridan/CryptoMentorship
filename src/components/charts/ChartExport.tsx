'use client'

import { useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Download, Share2, Printer } from 'lucide-react'

interface ChartExportProps {
  chartRef: React.RefObject<HTMLDivElement>
  filename?: string
}

export function ChartExport({ chartRef, filename = 'chart' }: ChartExportProps) {
  const handleExportPNG = async () => {
    if (!chartRef.current) return

    try {
      // Use html2canvas for PNG export
      const { default: html2canvas } = await import('html2canvas')
      const canvas = await html2canvas(chartRef.current, {
        backgroundColor: 'white',
        scale: 2,
        useCORS: true
      })
      
      const link = document.createElement('a')
      link.download = `${filename}.png`
      link.href = canvas.toDataURL()
      link.click()
    } catch (error) {
      console.error('Error exporting PNG:', error)
    }
  }

  const handleExportSVG = () => {
    if (!chartRef.current) return

    try {
      const svgElement = chartRef.current.querySelector('svg')
      if (!svgElement) return

      const svgData = new XMLSerializer().serializeToString(svgElement)
      const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' })
      const svgUrl = URL.createObjectURL(svgBlob)
      
      const link = document.createElement('a')
      link.download = `${filename}.svg`
      link.href = svgUrl
      link.click()
      
      URL.revokeObjectURL(svgUrl)
    } catch (error) {
      console.error('Error exporting SVG:', error)
    }
  }

  const handlePrint = () => {
    if (!chartRef.current) return

    const printWindow = window.open('', '_blank')
    if (!printWindow) return

    const chartHTML = chartRef.current.outerHTML
    printWindow.document.write(`
      <html>
        <head>
          <title>Chart Export</title>
          <style>
            body { margin: 0; padding: 20px; }
            svg { max-width: 100%; height: auto; }
          </style>
        </head>
        <body>
          ${chartHTML}
        </body>
      </html>
    `)
    printWindow.document.close()
    printWindow.print()
  }

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={handleExportPNG}
        className="flex items-center gap-2"
      >
        <Download className="h-4 w-4" />
        PNG
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={handleExportSVG}
        className="flex items-center gap-2"
      >
        <Share2 className="h-4 w-4" />
        SVG
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={handlePrint}
        className="flex items-center gap-2"
      >
        <Printer className="h-4 w-4" />
        Print
      </Button>
    </div>
  )
}
