import Papa from 'papaparse';
import { Decimal } from '../num';
import { SignalTrade } from './index';

export interface CSVImportRow {
  symbol: string;
  direction: 'LONG' | 'SHORT';
  entryTime: string;
  entryPrice: string;
  stopLoss?: string;
  takeProfit?: string;
  exitTime?: string;
  exitPrice?: string;
  conviction: number;
  riskPct: string;
  tags?: string;
  notes?: string;
}

export interface CSVImportResult {
  success: boolean;
  data: CSVImportRow[];
  errors: Array<{
    row: number;
    field: string;
    message: string;
  }>;
  summary: {
    totalRows: number;
    validRows: number;
    errorRows: number;
    duplicates: number;
  };
}

export interface CSVColumnMapping {
  symbol: string;
  direction: string;
  entryTime: string;
  entryPrice: string;
  stopLoss?: string;
  takeProfit?: string;
  exitTime?: string;
  exitPrice?: string;
  conviction: string;
  riskPct: string;
  tags?: string;
  notes?: string;
}

/**
 * Parse CSV file and return structured data
 */
export function parseCSVFile(file: File, mapping: CSVColumnMapping): Promise<CSVImportResult> {
  return new Promise((resolve) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const errors: Array<{ row: number; field: string; message: string }> = [];
        const data: CSVImportRow[] = [];
        const duplicates = new Set<string>();

        results.data.forEach((row: any, index: number) => {
          const rowNumber = index + 1;
          const rowData: Partial<CSVImportRow> = {};

          try {
            // Map columns to fields
            rowData.symbol = row[mapping.symbol]?.toString().trim().toUpperCase();
            if (!rowData.symbol) {
              errors.push({ row: rowNumber, field: 'symbol', message: 'Symbol is required' });
            }

            const direction = row[mapping.direction]?.toString().trim().toUpperCase();
            if (!direction || !['LONG', 'SHORT'].includes(direction)) {
              errors.push({ row: rowNumber, field: 'direction', message: 'Direction must be LONG or SHORT' });
            } else {
              rowData.direction = direction as 'LONG' | 'SHORT';
            }

            const entryTimeStr = row[mapping.entryTime]?.toString().trim();
            if (!entryTimeStr) {
              errors.push({ row: rowNumber, field: 'entryTime', message: 'Entry time is required' });
            } else {
              const entryTime = new Date(entryTimeStr);
              if (isNaN(entryTime.getTime())) {
                errors.push({ row: rowNumber, field: 'entryTime', message: 'Invalid date format' });
              } else {
                rowData.entryTime = entryTime.toISOString();
              }
            }

            const entryPriceStr = row[mapping.entryPrice]?.toString().trim();
            if (!entryPriceStr) {
              errors.push({ row: rowNumber, field: 'entryPrice', message: 'Entry price is required' });
            } else {
              try {
                new Decimal(entryPriceStr);
                rowData.entryPrice = entryPriceStr;
              } catch {
                errors.push({ row: rowNumber, field: 'entryPrice', message: 'Invalid price format' });
              }
            }

            // Optional fields
            if (mapping.stopLoss && row[mapping.stopLoss]) {
              const stopLossStr = row[mapping.stopLoss].toString().trim();
              try {
                new Decimal(stopLossStr);
                rowData.stopLoss = stopLossStr;
              } catch {
                errors.push({ row: rowNumber, field: 'stopLoss', message: 'Invalid stop loss format' });
              }
            }

            if (mapping.takeProfit && row[mapping.takeProfit]) {
              const takeProfitStr = row[mapping.takeProfit].toString().trim();
              try {
                new Decimal(takeProfitStr);
                rowData.takeProfit = takeProfitStr;
              } catch {
                errors.push({ row: rowNumber, field: 'takeProfit', message: 'Invalid take profit format' });
              }
            }

            if (mapping.exitTime && row[mapping.exitTime]) {
              const exitTimeStr = row[mapping.exitTime].toString().trim();
              const exitTime = new Date(exitTimeStr);
              if (isNaN(exitTime.getTime())) {
                errors.push({ row: rowNumber, field: 'exitTime', message: 'Invalid exit date format' });
              } else {
                rowData.exitTime = exitTime.toISOString();
              }
            }

            if (mapping.exitPrice && row[mapping.exitPrice]) {
              const exitPriceStr = row[mapping.exitPrice].toString().trim();
              try {
                new Decimal(exitPriceStr);
                rowData.exitPrice = exitPriceStr;
              } catch {
                errors.push({ row: rowNumber, field: 'exitPrice', message: 'Invalid exit price format' });
              }
            }

            const convictionStr = row[mapping.conviction]?.toString().trim();
            if (!convictionStr) {
              errors.push({ row: rowNumber, field: 'conviction', message: 'Conviction is required' });
            } else {
              const conviction = parseInt(convictionStr);
              if (isNaN(conviction) || conviction < 1 || conviction > 5) {
                errors.push({ row: rowNumber, field: 'conviction', message: 'Conviction must be 1-5' });
              } else {
                rowData.conviction = conviction;
              }
            }

            const riskPctStr = row[mapping.riskPct]?.toString().trim();
            if (!riskPctStr) {
              errors.push({ row: rowNumber, field: 'riskPct', message: 'Risk percentage is required' });
            } else {
              try {
                const riskPct = new Decimal(riskPctStr);
                if (riskPct.lte(0) || riskPct.gt(100)) {
                  errors.push({ row: rowNumber, field: 'riskPct', message: 'Risk percentage must be 0-100' });
                } else {
                  rowData.riskPct = riskPctStr;
                }
              } catch {
                errors.push({ row: rowNumber, field: 'riskPct', message: 'Invalid risk percentage format' });
              }
            }

            if (mapping.tags && row[mapping.tags]) {
              rowData.tags = row[mapping.tags].toString().trim();
            }

            if (mapping.notes && row[mapping.notes]) {
              rowData.notes = row[mapping.notes].toString().trim();
            }

            // Check for duplicates (same symbol, direction, entry time)
            if (rowData.symbol && rowData.direction && rowData.entryTime) {
              const duplicateKey = `${rowData.symbol}_${rowData.direction}_${rowData.entryTime}`;
              if (duplicates.has(duplicateKey)) {
                errors.push({ row: rowNumber, field: 'duplicate', message: 'Duplicate trade detected' });
              } else {
                duplicates.add(duplicateKey);
              }
            }

            // Only add to data if no errors
            if (errors.filter(e => e.row === rowNumber).length === 0) {
              data.push(rowData as CSVImportRow);
            }

          } catch (error) {
            errors.push({ 
              row: rowNumber, 
              field: 'general', 
              message: `Parse error: ${error instanceof Error ? error.message : 'Unknown error'}` 
            });
          }
        });

        resolve({
          success: errors.length === 0,
          data,
          errors,
          summary: {
            totalRows: results.data.length,
            validRows: data.length,
            errorRows: errors.length,
            duplicates: duplicates.size,
          }
        });
      },
      error: (error) => {
        resolve({
          success: false,
          data: [],
          errors: [{ row: 0, field: 'file', message: `CSV parse error: ${error.message}` }],
          summary: {
            totalRows: 0,
            validRows: 0,
            errorRows: 1,
            duplicates: 0,
          }
        });
      }
    });
  });
}

/**
 * Convert CSV import data to SignalTrade objects
 */
export function convertToSignalTrades(rows: CSVImportRow[]): Omit<SignalTrade, 'id' | 'createdAt' | 'updatedAt'>[] {
  return rows.map((row, index) => ({
    slug: `${row.symbol.toLowerCase()}-${new Date(row.entryTime).getTime()}`,
    symbol: row.symbol,
    market: 'crypto:spot',
    direction: row.direction.toLowerCase() as 'long' | 'short',
    thesis: undefined,
    tags: row.tags || '[]',
    entryTime: new Date(row.entryTime),
    entryPrice: new Decimal(row.entryPrice),
    stopLoss: row.stopLoss ? new Decimal(row.stopLoss) : undefined,
    takeProfit: row.takeProfit ? new Decimal(row.takeProfit) : undefined,
    conviction: row.conviction,
    riskPct: new Decimal(row.riskPct),
    status: (row.exitTime && row.exitPrice ? 'closed' : 'open') as 'open' | 'closed',
    exitTime: row.exitTime ? new Date(row.exitTime) : undefined,
    exitPrice: row.exitPrice ? new Decimal(row.exitPrice) : undefined,
    notes: row.notes || undefined,
  }));
}

/**
 * Generate CSV template with sample data
 */
export function generateCSVTemplate(): string {
  const headers = [
    'symbol',
    'direction', 
    'entryTime',
    'entryPrice',
    'stopLoss',
    'takeProfit',
    'exitTime',
    'exitPrice',
    'conviction',
    'riskPct',
    'tags',
    'notes'
  ];

  const sampleRows = [
    [
      'BTC',
      'LONG',
      '2024-01-15T10:30:00Z',
      '42000.50',
      '40000.00',
      '45000.00',
      '2024-01-20T14:45:00Z',
      '44800.25',
      '4',
      '2.5',
      '["crypto", "btc"]',
      'Strong breakout above resistance'
    ],
    [
      'ETH',
      'SHORT',
      '2024-01-18T09:15:00Z',
      '2650.75',
      '2700.00',
      '2500.00',
      '',
      '',
      '3',
      '1.8',
      '["crypto", "eth"]',
      'Bearish divergence on daily chart'
    ],
    [
      'SOL',
      'LONG',
      '2024-01-22T16:20:00Z',
      '95.40',
      '90.00',
      '105.00',
      '',
      '',
      '5',
      '3.0',
      '["crypto", "sol", "alt"]',
      'Major support bounce with volume'
    ]
  ];

  return [headers, ...sampleRows].map(row => row.join(',')).join('\n');
}

/**
 * Validate CSV column mapping
 */
export function validateColumnMapping(mapping: Partial<CSVColumnMapping>): string[] {
  const errors: string[] = [];
  
  if (!mapping.symbol) errors.push('Symbol column is required');
  if (!mapping.direction) errors.push('Direction column is required');
  if (!mapping.entryTime) errors.push('Entry time column is required');
  if (!mapping.entryPrice) errors.push('Entry price column is required');
  if (!mapping.conviction) errors.push('Conviction column is required');
  if (!mapping.riskPct) errors.push('Risk percentage column is required');
  
  return errors;
}
