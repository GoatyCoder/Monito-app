# Analisi backend-oriented del progetto Monito

## 1) Scopo della webapp e contesto operativo

Dalla struttura funzionale emerge una webapp per la **gestione operativa della produzione ortofrutticola**:

- pianificazione/apertura/chiusura delle **calibrazioni** (sessioni produttive per lotto/materia prima)
- avvio/chiusura delle **lavorazioni** su linee
- consuntivazione delle **pedane** con colli/peso
- gestione anagrafiche (grezzi, tipologie, varietà, imballaggi, lavorati, lotti)
- editor layout **etichetta**

L’app oggi è un frontend React + TypeScript con stato centralizzato in Context e persistenza su `localStorage` versionato.

---

## 2) Valutazione della struttura dati attuale

## 2.1 Punti forti

1. **Modello dominio già esplicito e tipizzato**
   - Le entità principali sono ben separate (`Calibration`, `Process`, `Pallet`) e le anagrafiche hanno campi audit/soft-delete coerenti (`MasterAuditFields`).

2. **Soft delete + audit fields già presenti**
   - Ottima base per Supabase: `isDeleted`, `createdAt`, `updatedAt`, `deletedAt` sono già tracciati.

3. **Validazioni dominio centralizzate**
   - `services/domain/registryValidation.ts` contiene regole di coerenza referenziale e business (es. `WeightType.EGALIZZATO` richiede `standardWeight > 0`).

4. **Schema versioning locale**
   - Persistenza v2 con migrazione v1→v2: approccio corretto per evoluzione progressiva.

## 2.2 Limiti attuali (pre-backend)

1. **Duplica dati denormalizzati in entità operative**
   - In `Calibration` e `Process` convivono sia id relazionali (`rawMaterialId`, `varietyId`, `productTypeId`, `packagingId`) sia campi testuali ridondanti (`rawMaterial`, `variety`, `productType`, `packaging`).
   - È utile lato UI, ma lato DB può introdurre inconsistenze se il nome anagrafico cambia.

2. **Context Store monolitico**
   - `services/store.tsx` concentra persistenza, business rules, notifiche, migrazione e CRUD: ottimo per MVP, ma difficile da scalare/testare.

3. **Mancanza di confini chiari tra “write model” e “read model”**
   - Le entità sono usate sia per scrittura che rendering UI senza layer DTO/query dedicati.

4. **Vincoli referenziali applicati solo a runtime frontend**
   - Finché non c’è DB con FK/constraint, l’integrità è “best effort” e non garantita.

---

## 3) Giudizio complessivo

La struttura attuale è **buona per MVP evolutivo** e già orientata a una migrazione su Supabase.

Se l’obiettivo è passare a multiutente, audit robusto e affidabilità operativa, conviene evolvere verso:

- modello relazionale normalizzato
- constraint a livello database
- API/service layer con responsabilità separate
- strategia chiara su snapshot storici vs lookup live

---

## 4) Raccomandazioni concrete per la migrazione a Supabase

## 4.1 Schema relazionale consigliato

### Tabelle anagrafiche

- `raw_materials`
- `raw_material_subtypes` (FK `raw_material_id`)
- `varieties` (FK `raw_material_id`, FK opzionale `subtype_id`)
- `packagings`
- `product_types` (FK opzionali `raw_material_id`, `subtype_id`, `variety_id`)
- `lots` (FK obbligatorie `raw_material_id`, `variety_id`, FK opzionale `subtype_id`)

### Tabelle operative

- `calibrations` (FK `lot_id`, `raw_material_id`, `subtype_id`, `variety_id`)
- `processes` (FK `calibration_id`, `product_type_id`, `packaging_id`)
- `pallets` (FK `process_id`)

### Tabelle trasversali

- `label_layouts` (versionabile)
- `app_events` (event log opzionale per audit/diagnostica)

## 4.2 Vincoli SQL da introdurre subito

- PK UUID su tutte le tabelle
- FK con `ON UPDATE RESTRICT` e `ON DELETE RESTRICT` (soft delete gestito applicativamente)
- Unique parziali su codici attivi:
  - esempio: `unique (upper(code)) where is_deleted = false`
- Check constraint:
  - `weight_type = 'EGALIZZATO' -> standard_weight is not null and > 0`

## 4.3 Soft delete: strategia consigliata

- Mantenere `is_deleted`, `deleted_at`, `created_at`, `updated_at`
- Esposizione standard via view `*_active` o query helper sempre filtrate
- Hard delete consentito solo via ruolo amministrativo e policy dedicata

## 4.4 RLS (Row Level Security)

- Abilitare RLS su tutte le tabelle
- Policy iniziale per team unico:
  - `authenticated` può leggere/scrivere record della propria `organization_id`
- Preparare subito `organization_id` per multi-tenant futuro

---

## 5) Miglioramenti architetturali backend-first (priorità)

1. **Separare lo store in layer**
   - `domain` (regole pure)
   - `repository` (I/O: localStorage ora, Supabase dopo)
   - `application service` (use case)

2. **Introdurre un adapter repository**
   - Interfaccia unica (`saveLot`, `listProcessesByCalibration`, etc.)
   - Implementazione `LocalStorageRepository` e successivamente `SupabaseRepository`

3. **Definire DTO espliciti**
   - `CreateLotInput`, `UpdateLotInput`, `LotReadModel`
   - Evita che la UI dipenda dal modello storage interno

4. **Gestire concorrenza e consistenza**
   - Colonne `version` o `updated_at` per optimistic locking
   - Transazioni RPC (o edge function) per operazioni composte (es. chiusura calibrazione + chiusura processi aperti)

5. **Osservabilità minima**
   - Audit log per azioni critiche (`DELETE`, `RESTORE`, `CLOSE_PROCESS`, `CLOSE_CALIBRATION`)

---

## 6) Rischi principali da mitigare

- **Inconsistenza nomi/id** (campi denormalizzati nei record operativi)
- **Race condition** in scenari multiutente (oggi non emerge in localStorage)
- **Regole duplicate** tra frontend e backend se non si centralizza la fonte di verità

---

## 7) Roadmap suggerita (breve)

1. Stabilizzare il modello (FK + unique + check).
2. Introdurre repository adapter senza cambiare UX.
3. Portare prima le anagrafiche su Supabase.
4. Portare flussi operativi (`calibrations`, `processes`, `pallets`) con transazioni.
5. Attivare RLS multi-tenant.
6. Ridurre i campi denormalizzati o trasformarli in snapshot versionati espliciti.

---

## 8) Conclusione

**Valutazione:** la struttura dati è già una base valida, ma va resa più rigorosa lato persistenza per evitare drift e inconsistenze quando entreranno in gioco utenti multipli e Supabase.

In sintesi: ottimo impianto per MVP, serve un passo deciso verso **normalizzazione + constraint DB + separazione layer applicativi** prima della piena produzione.
