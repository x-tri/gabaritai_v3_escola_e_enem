import * as fs from 'fs';
import * as path from 'path';

/**
 * TRI Data Loader - Carrega dados históricos do ENEM para cálculos TRI
 * CSV format: area;acertos;min;max;media;ano
 */

export interface TRIDataEntry {
  area: string;      // CH, CN, MT, LC
  acertos: number;   // 0-45
  min: number;       // minimum TRI score
  max: number;       // maximum TRI score
  media: number;     // average TRI score
  ano: number;       // year (2009-2023)
}

// Cache for loaded data
let cachedData: TRIDataEntry[] | null = null;

/**
 * Parse CSV number (handles Brazilian format with comma as decimal separator)
 */
function parseNumber(value: string): number {
  return parseFloat(value.replace(',', '.'));
}

export class TRIDataLoader {
  private data: TRIDataEntry[] = [];

  constructor(data?: TRIDataEntry[]) {
    this.data = data || [];
  }

  /**
   * Static method to load TRI data from CSV file
   * Returns cached data if already loaded
   */
  static async load(): Promise<TRIDataEntry[]> {
    if (cachedData !== null) {
      return cachedData;
    }

    try {
      // Try multiple possible paths for the CSV file
      const possiblePaths = [
        path.join(process.cwd(), 'tri', 'TRI ENEM DE 2009 A 2023 MIN MED E MAX.csv'),
        path.join(__dirname, '..', '..', '..', 'tri', 'TRI ENEM DE 2009 A 2023 MIN MED E MAX.csv'),
      ];

      let csvContent = '';
      for (const csvPath of possiblePaths) {
        if (fs.existsSync(csvPath)) {
          csvContent = fs.readFileSync(csvPath, 'utf-8');
          break;
        }
      }

      if (!csvContent) {
        console.warn('[TRIDataLoader] CSV file not found, returning empty data');
        cachedData = [];
        return cachedData;
      }

      // Parse CSV (semicolon separated, skip header)
      const lines = csvContent.split('\n').filter(line => line.trim());
      const entries: TRIDataEntry[] = [];

      for (let i = 1; i < lines.length; i++) {
        const parts = lines[i].split(';');
        if (parts.length >= 6) {
          entries.push({
            area: parts[0].trim(),
            acertos: parseInt(parts[1], 10),
            min: parseNumber(parts[2]),
            max: parseNumber(parts[3]),
            media: parseNumber(parts[4]),
            ano: parseInt(parts[5], 10),
          });
        }
      }

      cachedData = entries;
      console.log(`[TRIDataLoader] Loaded ${entries.length} TRI entries`);
      return cachedData;
    } catch (error) {
      console.error('[TRIDataLoader] Error loading CSV:', error);
      cachedData = [];
      return cachedData;
    }
  }

  /**
   * Clear cached data (useful for testing)
   */
  static clearCache(): void {
    cachedData = null;
  }

  /**
   * Carrega dados TRI para uma área específica
   */
  getDataByArea(area: string): TRIDataEntry[] {
    return this.data.filter(d => d.area === area);
  }

  /**
   * Carrega todos os dados TRI
   */
  getAllData(): TRIDataEntry[] {
    return this.data;
  }

  /**
   * Verifica se há dados carregados
   */
  hasData(): boolean {
    return this.data.length > 0;
  }
}
