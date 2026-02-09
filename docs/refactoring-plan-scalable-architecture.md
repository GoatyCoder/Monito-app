# Piano dettagliato di refactoring per Monito (scalabilità + Supabase)

## 0) Executive summary

Obiettivo: trasformare l’attuale app (React + Context + localStorage) in una piattaforma scalabile, robusta per multiutente, e pronta a migrare gradualmente su Supabase senza interrompere l’operatività.

Strategia: **strangler pattern** (migrazione incrementale), separando chiaramente:
- **Dominio** (regole business pure)
- **Application layer** (use case orchestrati)
- **Persistenza** (Repository con adapter localStorage/Supabase)
- **Presentazione** (UI + state management)

---

## 1) Stato attuale (sintesi tecnica)

### Punti già buoni
- Dominio tipizzato (`types.ts`) con entità operative e anagrafiche.
- Soft delete + audit fields per le anagrafiche.
- Validazioni centrali già avviate (`services/domain/registryValidation.ts`).
- Schema versionato per localStorage e migrazione v1→v2 (`services/store.tsx`).

### Limiti architetturali da risolvere
- `DataProvider` monolitico: business logic, persistenza, notifiche e migrazione nello stesso punto.
- Integrità referenziale applicata solo nel frontend (assenza di vincoli DB).
- Modello misto tra **snapshot testuale** e **relazioni ID** nelle entità operative.
- Assenza di repository abstraction, quindi forte accoppiamento UI-storage.
- Nessuna strategia di concorrenza (optimistic locking/versioning) in vista del multiutente.

---

## 2) Target architecture (modello a layer)

## 2.1 Struttura consigliata

```text
src/
  domain/
    entities/
    value-objects/
    services/          # regole pure
    errors/
  application/
    use-cases/
    dto/
    ports/             # interfacce repository
  infrastructure/
    persistence/
      local/
      supabase/
    mappers/
    telemetry/
  presentation/
    pages/
    components/
    stores/            # Zustand o Redux Toolkit
    hooks/
```

## 2.2 Regole di dipendenza
- `presentation` dipende solo da `application`.
- `application` dipende da `domain` e da interfacce (`ports`).
- `infrastructure` implementa i `ports` ma non contiene business rules.
- `domain` non dipende da framework/librerie UI/DB.

---

## 3) Refactoring del dominio (priorità alta)

## 3.1 Uniformare i modelli
- Definire un `AggregateRoot` minimale per entità principali (es. `Calibration`, `Process`, `Lot`).
- Distinguere:
  - **Write Model**: campi necessari per creazione/update.
  - **Read Model**: campi arricchiti per UI/reportistica.

## 3.2 Value Objects consigliati
- `Code` (normalizzazione uppercase, trim, lunghezza).
- `WeightKg` (min > 0, precisione max).
- `EntityId` (UUID).
- `TimestampIso`.

## 3.3 Error model consistente
- Contratto unico errori:
  - `DomainError { code, message, field?, metadata? }`
- Mappatura standard verso UI toast/form.

## 3.4 Invarianti da consolidare
- `Lot`: rawMaterial obbligatorio, variety coerente, subtype opzionale ma coerente.
- `ProductType`: `standardWeight` obbligatorio con `EGALIZZATO`.
- `Process`: non chiudibile due volte, `endTime >= startTime`.
- `Calibration`: chiusura con chiusura atomica processi aperti.

---

## 4) Refactoring persistenza (adapter + migrazione Supabase)

## 4.1 Introdurre Repository Port
Interfacce esempio:
- `RegistryRepository`
- `ProductionRepository`
- `LabelLayoutRepository`
- `AuditRepository`

Con metodi semantici (non CRUD generico):
- `createLot`, `updateLot`, `archiveLot`, `restoreLot`
- `openProcess`, `closeProcess`
- `closeCalibrationAndProcesses` (operazione transazionale)

## 4.2 Adapter locali
1. `LocalStorageRepository` (stato attuale, hardenizzato)
2. `SupabaseRepository` (nuovo)

La UI parla solo con `application use-cases`; il repository concreto è swapabile via DI/config feature flag.

## 4.3 Schema Supabase consigliato
Tabelle:
- `raw_materials`, `raw_material_subtypes`, `varieties`, `packagings`, `product_types`, `lots`
- `calibrations`, `processes`, `pallets`
- `label_layouts`
- `audit_events` (consigliata)

Vincoli:
- PK UUID
- FK `ON DELETE RESTRICT`
- Unique parziale su codici attivi (`upper(code)` + `is_deleted=false`)
- CHECK per regole peso
- Trigger `updated_at` automatico

## 4.4 RLS e multi-tenant
Aggiungere da subito:
- `organization_id` su tutte le tabelle di business
- Policy RLS per `authenticated`
- Accesso limitato per tenant

---

## 5) Application layer (use case-driven)

Creare use case espliciti:
- `CreateLotUseCase`
- `UpdateProductTypeUseCase`
- `ArchiveRawMaterialUseCase`
- `CloseProcessUseCase`
- `CloseCalibrationUseCase`
- `DuplicateCalibrationUseCase`

Ogni use case:
1. valida input DTO
2. invoca regole dominio
3. usa repository port
4. restituisce `Result<T, DomainError>`

Vantaggi:
- testabilità alta
- regole riusabili
- riduzione logica nel componente UI

---

## 6) State management frontend

Passare gradualmente da Context monolitico a store per feature (es. Zustand):
- `useProductionStore`
- `useRegistryStore`
- `useLabelStore`

Pattern:
- query/selectors memoizzati
- comandi asincroni (`actions`) che invocano use case
- UI “dumb” + hook orchestratori

---

## 7) Concorrenza, consistenza, idempotenza

## 7.1 Optimistic locking
- Aggiungere `version` o usare `updated_at` confronto pre-update.
- In caso conflitto: errore dominio `CONCURRENT_MODIFICATION`.

## 7.2 Operazioni atomiche
Da implementare via RPC/transaction:
- chiusura calibrazione + chiusura processi aperti
- import anagrafiche (all-or-nothing per batch)

## 7.3 Idempotenza
- Operazioni sensibili (es. `closeProcess`) idempotenti lato server.

---

## 8) Osservabilità e operabilità

## 8.1 Audit trail
`audit_events` con:
- `event_type`, `entity`, `entity_id`, `payload_diff`, `actor_id`, `timestamp`

## 8.2 Logging strutturato
- Correlation ID per request/use-case.
- Error code dominio sempre loggato.

## 8.3 Metriche
- tempo medio use case
- error rate validazione
- conflitti concorrenza
- throughput pedane/lavorazioni

---

## 9) Test strategy (fondamentale)

## 9.1 Pyramid
1. **Unit test dominio** (alta priorità)
2. **Integration test repository** (local + Supabase test DB)
3. **E2E test flussi critici** (Playwright)

## 9.2 Flussi critici da coprire
- CRUD anagrafiche con soft/hard delete
- coerenza lot/subtype/variety
- ciclo calibrazione → processi → pedane
- duplicazione calibrazione
- migrazione storage versionata

## 9.3 Quality gates CI
- `npm run lint`
- `npm run test`
- `npm run build`
- E2E smoke su PR (almeno flusso base)

---

## 10) Piano di rollout incrementale (6 milestone)

## Milestone 1 — Foundation (1 sprint)
- Estrarre moduli dominio puri
- Introdurre DTO e Result type
- Ridurre logica diretta nei componenti

**Deliverable:** layer dominio/application iniziale funzionante su localStorage.

## Milestone 2 — Repository abstraction (1 sprint)
- Definire ports repository
- Implementare `LocalStorageRepository`
- Adattare use case e store UI

**Deliverable:** UI disaccoppiata da localStorage.

## Milestone 3 — Schema Supabase + migrazioni DB (1 sprint)
- DDL tabelle, FK, unique parziali, check, trigger
- RLS base e `organization_id`

**Deliverable:** ambiente Supabase pronto (staging).

## Milestone 4 — Dual-read / write selettiva (1-2 sprint)
- Feature flag per switch repository
- Prime feature su Supabase (anagrafiche)

**Deliverable:** anagrafiche operative su Supabase in staging/prod pilot.

## Milestone 5 — Flussi operativi e transazioni (1-2 sprint)
- Porting calibrations/processes/pallets
- RPC per operazioni atomiche

**Deliverable:** flusso produzione completo su Supabase.

## Milestone 6 — Hardening & decommission localStorage (1 sprint)
- Audit trail completo
- metriche/alert
- rimozione fallback locale

**Deliverable:** architettura fully backend-driven.

---

## 11) Backlog tecnico prioritizzato (pronto sprint planning)

### P0 (immediato)
- Estrazione use case da `DataProvider`
- Introduzione `RepositoryPort`
- Test unitari regole dominio core

### P1 (breve)
- Schema Supabase completo con constraint
- RLS + `organization_id`
- Integrazione store frontend per feature

### P2 (medio)
- Audit trail e metriche
- import/export robusto con report
- ottimizzazione performance query + indici

---

## 12) KPI di successo del refactoring

- Riduzione complessità ciclomatica in `store` > 60%
- Copertura test dominio/use-case > 80%
- 0 violazioni referenziali in staging
- Tempo medio operazioni critiche < 300ms
- Errori runtime lato UI ridotti > 50%

---

## 13) Decision log (ADR) da aprire subito

1. ADR-001: scelta state management (Zustand vs Redux Toolkit)
2. ADR-002: snapshot testuali nei record operativi (sì/no + policy)
3. ADR-003: strategia optimistic locking (`version` vs `updated_at`)
4. ADR-004: transazioni in RPC vs edge functions
5. ADR-005: livelli minimi di audit/compliance

---

## 14) Nota pratica per partire domani

Primo step consigliato: refactor interno senza cambiare UX.
- Creare 2 use case (`CreateLot`, `CloseProcess`)
- introdurre `ProductionRepositoryPort`
- implementare `LocalStorageProductionRepository`
- collegare i componenti ai use case
- aggiungere test unit/integration minimi

Questo crea il “binario giusto” per migrare poi a Supabase con rischio minimo.
