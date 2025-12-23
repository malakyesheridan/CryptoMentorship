'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { AdminSidebar } from '@/components/admin/AdminSidebar'
import { 
  Upload, 
  FileText, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  Download,
  ArrowLeft
} from 'lucide-react'
import Link from 'next/link'
import { 
  parseCSVFile, 
  convertToSignalTrades, 
  generateCSVTemplate,
  validateColumnMapping,
  CSVColumnMapping,
  CSVImportRow
} from '@/lib/perf/csv-import'
import { formatDate } from '@/lib/dates'

interface ImportStep {
  step: 'upload' | 'mapping' | 'preview' | 'import'
  data?: CSVImportRow[]
  errors?: Array<{ row: number; field: string; message: string }>
  mapping?: CSVColumnMapping
}

export default function CSVImportPage() {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState<ImportStep>({ step: 'upload' })
  const [file, setFile] = useState<File | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [importResult, setImportResult] = useState<{
    success: boolean
    imported: number
    errors: number
  } | null>(null)

  const handleFileUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFile = event.target.files?.[0]
    if (!uploadedFile) return

    setFile(uploadedFile)
    setIsLoading(true)

    try {
      // Parse CSV with default mapping
      const defaultMapping: CSVColumnMapping = {
        symbol: 'symbol',
        direction: 'direction',
        entryTime: 'entryTime',
        entryPrice: 'entryPrice',
        stopLoss: 'stopLoss',
        takeProfit: 'takeProfit',
        exitTime: 'exitTime',
        exitPrice: 'exitPrice',
        conviction: 'conviction',
        riskPct: 'riskPct',
        tags: 'tags',
        notes: 'notes'
      }

      const result = await parseCSVFile(uploadedFile, defaultMapping)
      
      if (result.success) {
        setCurrentStep({
          step: 'preview',
          data: result.data,
          errors: result.errors,
          mapping: defaultMapping
        })
      } else {
        setCurrentStep({
          step: 'mapping',
          data: result.data,
          errors: result.errors,
          mapping: defaultMapping
        })
      }
    } catch (error) {
      console.error('Error parsing CSV:', error)
      setCurrentStep({
        step: 'upload',
        errors: [{ row: 0, field: 'file', message: 'Failed to parse CSV file' }]
      })
    } finally {
      setIsLoading(false)
    }
  }, [])

  const handleMappingUpdate = useCallback(async (mapping: CSVColumnMapping) => {
    if (!file) return

    setIsLoading(true)
    try {
      const result = await parseCSVFile(file, mapping)
      setCurrentStep({
        step: 'preview',
        data: result.data,
        errors: result.errors,
        mapping
      })
    } catch (error) {
      console.error('Error parsing CSV with mapping:', error)
    } finally {
      setIsLoading(false)
    }
  }, [file])

  const handleImport = useCallback(async () => {
    if (!currentStep.data || !currentStep.mapping) return

    setIsLoading(true)
    try {
      const trades = convertToSignalTrades(currentStep.data)
      
      // TODO: Implement actual import API call
      const response = await fetch('/api/admin/signals/import', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ trades })
      })

      if (response.ok) {
        const result = await response.json()
        setImportResult({
          success: true,
          imported: result.imported,
          errors: result.errors
        })
        setCurrentStep({ step: 'import' })
      } else {
        throw new Error('Import failed')
      }
    } catch (error) {
      console.error('Error importing trades:', error)
      setImportResult({
        success: false,
        imported: 0,
        errors: 1
      })
    } finally {
      setIsLoading(false)
    }
  }, [currentStep])

  const downloadTemplate = useCallback(() => {
    const template = generateCSVTemplate()
    const blob = new Blob([template], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'signals-import-template.csv'
    a.click()
    URL.revokeObjectURL(url)
  }, [])

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="flex">
        <AdminSidebar />
        <div className="flex-1 p-8">
          <div className="max-w-4xl mx-auto">
            {/* Header */}
            <div className="mb-8">
              <div className="flex items-center gap-4 mb-4">
                <Link href="/admin/signals">
                  <Button variant="outline" size="sm" className="flex items-center gap-2">
                    <ArrowLeft className="h-4 w-4" />
                    Back to Signals
                  </Button>
                </Link>
                <div>
                  <h1 className="text-3xl font-bold text-slate-900">Import Signals</h1>
                  <p className="text-slate-600 mt-2">
                    Upload a CSV file to import multiple trading signals
                  </p>
                </div>
              </div>

              {/* Progress Steps */}
              <div className="flex items-center gap-4 mb-6">
                <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm ${
                  currentStep.step === 'upload' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'
                }`}>
                  <Upload className="h-4 w-4" />
                  Upload
                </div>
                <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm ${
                  currentStep.step === 'mapping' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'
                }`}>
                  <FileText className="h-4 w-4" />
                  Mapping
                </div>
                <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm ${
                  currentStep.step === 'preview' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'
                }`}>
                  <CheckCircle className="h-4 w-4" />
                  Preview
                </div>
                <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm ${
                  currentStep.step === 'import' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'
                }`}>
                  <CheckCircle className="h-4 w-4" />
                  Import
                </div>
              </div>
            </div>

            {/* Step Content */}
            {currentStep.step === 'upload' && (
              <div className="bg-white p-8 rounded-lg shadow-sm border border-slate-200">
                <div className="text-center">
                  <Upload className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-slate-900 mb-2">
                    Upload CSV File
                  </h3>
                  <p className="text-slate-600 mb-6">
                    Select a CSV file containing trading signals data
                  </p>
                  
                  <div className="mb-6">
                    <Input
                      type="file"
                      accept=".csv"
                      onChange={handleFileUpload}
                      disabled={isLoading}
                      className="max-w-md mx-auto"
                    />
                  </div>

                  <div className="flex items-center justify-center gap-4">
                    <Button
                      variant="outline"
                      onClick={downloadTemplate}
                      className="flex items-center gap-2"
                    >
                      <Download className="h-4 w-4" />
                      Download Template
                    </Button>
                  </div>

                  {currentStep.errors && (
                    <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                      <div className="flex items-center gap-2 text-red-700">
                        <XCircle className="h-5 w-5" />
                        <span className="font-medium">Upload Error</span>
                      </div>
                      <p className="text-red-600 mt-1">
                        {currentStep.errors[0]?.message}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {currentStep.step === 'mapping' && (
              <div className="bg-white p-8 rounded-lg shadow-sm border border-slate-200">
                <h3 className="text-lg font-semibold text-slate-900 mb-4">
                  Column Mapping
                </h3>
                <p className="text-slate-600 mb-6">
                  Map CSV columns to signal fields. Some columns are required.
                </p>
                
                {/* TODO: Implement column mapping UI */}
                <div className="text-center py-8">
                  <AlertTriangle className="h-8 w-8 text-yellow-500 mx-auto mb-2" />
                  <p className="text-slate-600">Column mapping UI coming soon...</p>
                </div>
              </div>
            )}

            {currentStep.step === 'preview' && (
              <div className="bg-white p-8 rounded-lg shadow-sm border border-slate-200">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-semibold text-slate-900">
                    Preview Import
                  </h3>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-slate-600">
                      {currentStep.data?.length || 0} rows ready to import
                    </span>
                  </div>
                </div>

                {currentStep.errors && currentStep.errors.length > 0 && (
                  <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <div className="flex items-center gap-2 text-yellow-700 mb-2">
                      <AlertTriangle className="h-5 w-5" />
                      <span className="font-medium">Validation Errors</span>
                    </div>
                    <div className="text-sm text-yellow-600">
                      {currentStep.errors.length} rows have errors and will be skipped.
                    </div>
                  </div>
                )}

                {/* Preview Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="px-3 py-2 text-left font-medium text-slate-700">Symbol</th>
                        <th className="px-3 py-2 text-left font-medium text-slate-700">Direction</th>
                        <th className="px-3 py-2 text-left font-medium text-slate-700">Entry Time</th>
                        <th className="px-3 py-2 text-left font-medium text-slate-700">Entry Price</th>
                        <th className="px-3 py-2 text-left font-medium text-slate-700">Conviction</th>
                        <th className="px-3 py-2 text-left font-medium text-slate-700">Risk %</th>
                        <th className="px-3 py-2 text-left font-medium text-slate-700">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {currentStep.data?.slice(0, 10).map((row, index) => (
                        <tr key={index} className="border-b border-slate-100">
                          <td className="px-3 py-2">{row.symbol}</td>
                          <td className="px-3 py-2">
                            <span className={`px-2 py-1 rounded text-xs ${
                              row.direction === 'LONG' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                            }`}>
                              {row.direction}
                            </span>
                          </td>
                          <td className="px-3 py-2">{formatDate(row.entryTime)}</td>
                          <td className="px-3 py-2">${row.entryPrice}</td>
                          <td className="px-3 py-2">{row.conviction}/5</td>
                          <td className="px-3 py-2">{row.riskPct}%</td>
                          <td className="px-3 py-2">
                            <span className={`px-2 py-1 rounded text-xs ${
                              row.exitTime ? 'bg-slate-100 text-slate-700' : 'bg-blue-100 text-blue-700'
                            }`}>
                              {row.exitTime ? 'Closed' : 'Open'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {currentStep.data && currentStep.data.length > 10 && (
                  <p className="text-sm text-slate-600 mt-4 text-center">
                    Showing first 10 rows of {currentStep.data.length} total rows
                  </p>
                )}

                <div className="flex items-center justify-end gap-3 mt-6">
                  <Button
                    variant="outline"
                    onClick={() => setCurrentStep({ step: 'upload' })}
                  >
                    Back
                  </Button>
                  <Button
                    onClick={handleImport}
                    disabled={isLoading || !currentStep.data?.length}
                    className="flex items-center gap-2"
                  >
                    {isLoading ? 'Importing...' : 'Import Signals'}
                  </Button>
                </div>
              </div>
            )}

            {currentStep.step === 'import' && importResult && (
              <div className="bg-white p-8 rounded-lg shadow-sm border border-slate-200">
                <div className="text-center">
                  {importResult.success ? (
                    <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                  ) : (
                    <XCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
                  )}
                  
                  <h3 className="text-lg font-semibold text-slate-900 mb-2">
                    {importResult.success ? 'Import Successful' : 'Import Failed'}
                  </h3>
                  
                  <p className="text-slate-600 mb-6">
                    {importResult.success 
                      ? `${importResult.imported} signals imported successfully`
                      : 'There was an error importing the signals'
                    }
                  </p>

                  <div className="flex items-center justify-center gap-3">
                    <Link href="/admin/signals">
                      <Button className="flex items-center gap-2">
                        View Signals
                      </Button>
                    </Link>
                    <Button
                      variant="outline"
                      onClick={() => setCurrentStep({ step: 'upload' })}
                    >
                      Import More
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
