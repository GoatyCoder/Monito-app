# Anagrafiche v2 — Proposta di evoluzione

## Obiettivi
- Mettere in sicurezza le anagrafiche con **integrità referenziale**.
- Introdurre **soft delete** su tutte le anagrafiche, mantenendo la possibilità di **hard delete** (protetta da ruolo/policy).
- Centralizzare le **regole di validazione** in un unico modulo di dominio.
- Preparare il codice al passaggio da localStorage a backend (Supabase), con **schema versionato** e migrazioni.
- Rifattorizzare `RegistryManager` in moduli tipizzati e manutenibili.
- Aggiungere import/export anagrafiche in modo sicuro (validazione + report errori).

---

## 1) Nuovo schema dati (anagrafiche)

### 1.1 Campi comuni (BaseMaster)
Da applicare a: `RawMaterial`, `RawMaterialSubtype`, `Variety`, `Packaging`, `ProductType`, `Lot`.

```ts
interface BaseMaster {
  id: string;
  code?: string;
  isDeleted: boolean;         // soft delete flag
  deletedAt?: string;         // ISO
  createdAt: string;          // ISO
  updatedAt: string;          // ISO
}
```

### 1.2 Entità anagrafiche (v2)
- `RawMaterial`: + `isDeleted`, audit fields.
- `RawMaterialSubtype`: relazione forte su `rawMaterialId` + soft delete.
- `Variety`: relazione forte su `rawMaterialId`, opzionale `subtypeId` + soft delete.
- `Packaging`: soft delete.
- `ProductType`: vincoli opzionali su `rawMaterialId`/`subtypeId`/`varietyId`, soft delete.
- `Lot`: relazione su `rawMaterialId`, `varietyId` obbligatorio e `subtypeId` opzionale, soft delete.

### 1.3 Policy cancellazione
- **Soft delete (default)**: tutte le azioni “Elimina” in UI impostano `isDeleted=true`.
- **Hard delete (solo autorizzati)**: consentito solo se:
  - non ci sono riferimenti attivi; oppure
  - policy esplicita di cascade/forzatura.

> Nota: lato UI introdurremo in seguito ruoli (es. `ADMIN`) per esporre l’hard delete.

---

## 2) Regole di validazione centrali

Creare modulo dominio unico (es. `services/domain/registryValidation.ts`) con funzioni pure.

### 2.1 Regole base
- `code` obbligatorio per: grezzo, varietà, lavorato, imballaggio (e lotto), trim + uppercase.
- Unicità codice su record **non eliminati** (`!isDeleted`).
- Lunghezza minima/massima configurabile per ciascuna entità.

### 2.2 Regole referenziali
- `Subtype.rawMaterialId` deve esistere ed essere attivo.
- `Variety.rawMaterialId` deve esistere; se `subtypeId` presente deve appartenere allo stesso `rawMaterialId`.
- `Lot.rawMaterialId` deve esistere; `subtypeId` e `varietyId` coerenti con il grezzo.
- `ProductType` con vincoli (`rawMaterialId/subtypeId/varietyId`) coerenti tra loro.

### 2.3 Regole business consigliate
- `standardWeight` obbligatorio e > 0 se `weightType=EGALIZZATO`.
- Vietare hard delete se l’anagrafica è referenziata da dati operativi (`calibrations`, `processes`, `pallets`) salvo policy `force`.

### 2.4 Contratto errori
Restituire oggetto standard:
```ts
{ ok: boolean; code?: string; message?: string; field?: string }
```

---

## 3) Import/Export anagrafiche

### 3.1 Export
- Pulsante “Esporta anagrafiche” in Registry.
- Formato JSON versionato:
```json
{
  "schemaVersion": 2,
  "exportedAt": "2026-...",
  "data": {
    "rawMaterials": [],
    "subtypes": [],
    "varieties": [],
    "packagings": [],
    "productTypes": [],
    "lots": []
  }
}
```

### 3.2 Import
- Modal import con opzioni:
  - `merge` (default): aggiorna/esegue upsert per codice.
  - `replace` (solo admin): sostituisce le anagrafiche dopo validazione completa.
- Report finale:
  - record importati
  - record saltati
  - errori per riga/entità

---

## 4) Wireframe UX (testuale)

## 4.1 Registry Home
- Header: `Anagrafiche` | `Importa` | `Esporta`
- Filtri globali: ricerca, stato (`Attivi`, `Eliminati`, `Tutti`)
- Tabs: Grezzi, Tipologie, Varietà, Imballaggi, Lavorati, Lotti, Etichetta

## 4.2 Lista tab (pattern comune)
- Tabella: codice, descrizione, relazioni, stato, azioni
- Azioni riga:
  - `Modifica`
  - `Elimina` (soft)
  - `Ripristina` (se eliminato)
  - `Elimina definitivamente` (solo ruolo abilitato)

## 4.3 Form anagrafica
- Sezione “Dati base”
- Sezione “Relazioni” (con vincoli guidati)
- Sezione “Validazioni” (errori inline)
- Footer: Salva / Annulla

## 4.4 Import wizard
1. Upload file
2. Validazione struttura/schema
3. Preview modifiche (insert/update/skip)
4. Conferma + report

---

## 5) Integrità referenziale + soft delete

### 5.1 Strategia
- Tutte le query UI devono usare `getActive*()` (filtro `!isDeleted`).
- Le funzioni di dominio lavorano su dataset completo (attivi + eliminati) per controlli di unicità/storico.

### 5.2 Blocco cancellazioni per riferimenti attivi
Esempi:
- non eliminare `rawMaterial` se usato da `lots`/`calibrations` attive.
- non eliminare `packaging` se usato da `processes` aperti.

---

## 6) Refactor RegistryManager in moduli tipizzati

### 6.1 Struttura proposta
- `components/registry/RegistryPage.tsx`
- `components/registry/tabs/RawMaterialsTab.tsx`
- `components/registry/tabs/SubtypesTab.tsx`
- `components/registry/tabs/VarietiesTab.tsx`
- `components/registry/tabs/PackagingsTab.tsx`
- `components/registry/tabs/ProductTypesTab.tsx`
- `components/registry/tabs/LotsTab.tsx`
- `components/registry/shared/RegistryTable.tsx`
- `components/registry/shared/ImportExportBar.tsx`
- `hooks/useRegistryFilters.ts`
- `hooks/usePagination.ts`
- `types/registryForms.ts`

### 6.2 Tipizzazione
- Eliminare `any` in handler/form.
- DTO dedicati per create/update per ogni entità.
- Mapper UI->Domain centralizzati.

---

## 7) Schema version + migrazioni localStorage

### 7.1 Persistenza versionata
```json
{
  "schemaVersion": 2,
  "data": { ... }
}
```

### 7.2 Migrazione v1 -> v2
1. Leggere payload v1 attuale.
2. Per ogni anagrafica, aggiungere campi:
   - `isDeleted=false`
   - `createdAt=now` (fallback)
   - `updatedAt=now`
3. Validare relazioni minime.
4. Salvare in formato v2.

### 7.3 Safety
- Backup automatico pre-migrazione (`monito_production_data_v1_backup_<timestamp>`).
- In caso errore: rollback al backup e toast di errore.

---

## 8) Piano di rollout (incrementale)

### Fase 1 — Fondamenta dominio
- Aggiunta schema v2 + migratore localStorage.
- Modulo validazioni centrali.
- CRUD store con soft delete.

### Fase 2 — UX anagrafiche
- Split `RegistryManager` in moduli tipizzati.
- Filtri stato attivo/eliminato.
- Azioni ripristina/hard delete (feature flag ruolo).

### Fase 3 — Import/Export
- Export JSON versionato.
- Import wizard + report.

### Fase 4 — Hardening pre-Supabase
- Test e2e flussi anagrafiche.
- Metriche errori validazione.
- Adapter layer per migrare facilmente da localStorage a backend.

---

## 9) Decisioni già prese (in base ai requisiti)
- ✅ Soft delete richiesto per anagrafiche.
- ✅ Hard delete deve esistere (abilitazione con ruoli in step successivo).
- ❌ Storico modifiche completo non prioritario.
- ✅ Eventuale log minimale è accettabile.
- ✅ Import/Export anagrafiche richiesto.

