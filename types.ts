
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

export interface MasterAuditFields {
  isDeleted: boolean;
  deletedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface RawMaterial extends MasterAuditFields {
  id: string;
  code: string; // Mnemonic code (e.g., MND)
  name: string; // e.g., "Mandarini"
  calibers?: string[]; // Ordered list of calibers (e.g., ['AAA', 'AA', 'A'])
}

export interface RawMaterialSubtype extends MasterAuditFields {
  id: string;
  rawMaterialId: string;
  name: string; 
}

export interface Variety extends MasterAuditFields {
  id: string;
  rawMaterialId: string;
  subtypeId?: string;
  code: string; // Mnemonic code (e.g., NAD)
  name: string; 
}

export interface Packaging extends MasterAuditFields {
  id: string;
  code: string; // Mnemonic code (e.g., C34)
  name: string; 
}

export interface Lot extends MasterAuditFields {
  id: string;
  code: string; // Batch Code (e.g., 14002)
  rawMaterialId: string;
  subtypeId?: string;
  varietyId: string;
  producer: string;
  notes?: string;
}

export interface ProductType extends MasterAuditFields {
  id: string;
  code: string; // Mnemonic code (e.g., M12)
  name: string; 
  nature: ProductNature;
  quality: ProductQuality;
  ean?: string;
  weightType: WeightType;
  standardWeight?: number;
  
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
  width: number; // mm
  height: number; // mm
  elements: LabelElement[];
}

// Interfaces
export interface Calibration {
  id: string;
  lotId?: string; // Reference to Lot registry
  lotCode?: string; // Snapshot at creation time
  rawMaterialId?: string;
  subtypeId?: string; 
  varietyId: string;
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
  note?: string;

  // Immutable snapshots from calibration at process creation.
  lotCode?: string;
  rawMaterial?: string;
  subtype?: string;
  variety?: string;
  producer?: string;
}

export interface Pallet {
  id: string;
  processId: string;
  timestamp: string;
  caseCount: number; 
  weight: number; 
  notes?: string;

  // Immutable snapshots at pallet creation time.
  lotCode?: string;
  rawMaterial?: string;
  variety?: string;
  producer?: string;
  productType?: string;
  packaging?: string;
  line?: string;
  caliber?: string;
}

export enum UserRole {
  ADMIN = 'ADMIN',
  MANAGER = 'MANAGER',
  OPERATOR = 'OPERATOR',
}

export interface AuditEvent {
  id: string;
  timestamp: string;
  action: string;
  entity: string;
  entityId?: string;
  actorRole: UserRole;
  message: string;
  metadata?: Record<string, string | number | boolean | null | undefined>;
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
