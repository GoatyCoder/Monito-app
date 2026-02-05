
// Enums
export enum CalibrationStatus {
  PROGRAMMED = 'PROGRAMMATA',
  OPEN = 'APERTA',
  CLOSED = 'CHIUSA',
}

export enum ProcessStatus {
  OPEN = 'APERTA',
  CLOSED = 'CHIUSA',
}

export enum WeightType {
  EGALIZZATO = 'EGALIZZATO',
  VARIABILE = 'VARIABILE',
}

export enum ProductQuality {
  EXTRA = 'EXTRA',
  PRIMA = 'I CATEGORIA',
  SECONDA = 'II CATEGORIA',
  INDUSTRIA = 'INDUSTRIA',
}

export enum ProductNature {
  FINITO = 'PRODOTTO FINITO',
  SEMILAVORATO = 'SEMILAVORATO',
  SCARTO = 'SCARTO/INDUSTRIA',
}

// Master Data Interfaces
export interface RawMaterial {
  id: string;
  code: string; // Mnemonic code (e.g., MND)
  name: string; // e.g., "Mandarini"
  calibers?: string[]; // Ordered list of calibers (e.g., ['AAA', 'AA', 'A'])
}

export interface RawMaterialSubtype {
  id: string;
  rawMaterialId: string;
  name: string; 
}

export interface Variety {
  id: string;
  rawMaterialId: string;
  subtypeId?: string;
  code: string; // Mnemonic code (e.g., NAD)
  name: string; 
}

export interface Packaging {
  id: string;
  code: string; // Mnemonic code (e.g., C34)
  name: string; 
}

export interface Lot {
  id: string;
  code: string; // Batch Code (e.g., 14002)
  rawMaterialId: string;
  subtypeId?: string;
  varietyId?: string;
  producer: string;
  notes?: string;
}

export interface ProductType {
  id: string;
  code: string; // Mnemonic code (e.g., M12)
  name: string; 
  nature: ProductNature;
  quality: ProductQuality;
  ean?: string;
  weightType: WeightType;
  standardWeight?: number;
  labelLayoutId?: string; // Specific label template for this product
  
  // Constraints
  rawMaterialId?: string;
  subtypeId?: string;
  varietyId?: string;
}

// Label Editor Types
export type LabelFieldType = 'rawMaterial' | 'productType' | 'variety' | 'packaging' | 'lotCode' | 'palletId' | 'quality' | 'caseCount' | 'weight' | 'date' | 'producer' | 'companyInfo' | 'staticText';

export interface LabelElement {
  id: string;
  type: LabelFieldType;
  label: string; // Display name
  customText?: string; // For static text
  prefix?: string; 
  suffix?: string; 
  x: number;
  y: number;
  width: number;
  height: number;
  fontSize: number;
  isBold: boolean;
  textAlign: 'left' | 'center' | 'right';
}

export interface LabelLayout {
  id: string;
  name: string;
  isDefault: boolean;
  width: number; // mm
  height: number; // mm
  elements: LabelElement[];
}

// Interfaces
export interface Calibration {
  id: string;
  lotId?: string; // Reference to Lot registry
  rawMaterialId?: string;
  subtypeId?: string; 
  varietyId?: string;
  rawMaterial: string; 
  subtype?: string; 
  variety: string;
  producer: string;
  startDate: string; 
  status: CalibrationStatus;
  note?: string;
  incomingRawWeight: number; 
}

export interface Process {
  id: string;
  calibrationId: string;
  productTypeId?: string;
  packagingId?: string;
  line: string; 
  caliber: string;
  productType: string;
  packaging: string;
  weightType?: WeightType;
  standardWeight?: number;
  startTime: string;
  endTime?: string;
  status: ProcessStatus;
}

export interface Pallet {
  id: string;
  processId: string;
  timestamp: string;
  caseCount: number; 
  weight: number; 
  notes?: string;
}

export interface ProcessStats {
  totalPallets: number;
  totalCases: number;
  totalWeight: number;
}

export interface CalibrationStats {
  totalWeight: number;
  processCount: number;
  yieldPercentage: number;
}
