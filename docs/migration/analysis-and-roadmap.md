# Monito - Analisi dell'app esistente e roadmap di refactoring

## 1) Logica attuale (React + store monolitico)

L'app corrente usa un unico `DataProvider` React con persistenza localStorage, regole di dominio, orchestrazione use-case e gestione UI-toast tutte nello stesso livello. Questo consente velocità iniziale ma crea alto accoppiamento tra:

- stato UI,
- stato dominio,
- persistence,
- audit,
- validazioni,
- side-effect.

## 2) Punti non logici / fragili da rivedere

1. **Source of truth duplicata**: molte entità salvano sia ID relazionali sia snapshot testuali (`rawMaterialId` + `rawMaterial`) con rischio divergenza dopo update.
2. **Hard-delete incoerente**: alcune validazioni hard-delete dipendono da euristiche stringa (es. packaging verificato su `productTypes.name`), non su FK esplicite.
3. **Regole dominio nello store UI**: invarianti critici (es. peso standard in egalizzato) convivono con dettagli di rendering, aumentando regressioni.
4. **Transazioni assenti**: update multi-entity (propagazione snapshot) senza boundary transazionale.
5. **ID e timestamp generati client-side**: rischio collisioni/log non affidabile in multi-device.
6. **Mancanza separazione comando/query**: funzioni CRUD e reportistica sono mescolate nel provider.
7. **Migrazioni schema limitate**: è presente migrazione v1→v2, ma senza strategia versionata incrementale/rollback.
8. **Testing non strutturato**: assenza di test automatici su use case e invarianti.

## 3) Refactoring eseguito (nuova base C#)

È stata introdotta una nuova architettura scalabile con separazione per layer:

- `Monito.Domain`: entità e invarianti.
- `Monito.Application`: DTO, use-case service, orchestrazione.
- `Monito.Infrastructure`: repository locale in-memory + gateway Supabase ready.
- `Monito.Api`: Minimal API con endpoint produzione.
- `Monito.Web`: frontend Blazor WASM che consuma API.

## 4) Preparazione Supabase (restando in locale)

- Introdotta astrazione `ISupabaseGateway`.
- Configurazione `Supabase:Url` e `Supabase:AnonKey` in `appsettings.Development.json`.
- Health endpoint espone modalità runtime (`local-inmemory` vs `supabase-ready`).

Questa impostazione consente swap incrementale repository:

- oggi: `InMemoryProductionRepository`
- step successivo: `SupabaseProductionRepository` (stessa interfaccia dominio).

## 5) Pattern applicati

- **DDD tactical (light)** per aggregate roots e invarianti.
- **Repository pattern** su interfaccia dominio.
- **Application service** come orchestratore use-case.
- **Unit of Work abstraction** per introdurre persistenza transazionale senza toccare use-case.
- **Dependency Injection** centralizzata in extension method.

## 6) Prossimi step consigliati

1. Aggiungere `SupabaseProductionRepository` con mapping DTO↔dominio.
2. Introdurre auth/ruoli (JWT Supabase) e audit trail server-side.
3. Spostare validazioni anagrafiche in value objects/domain services dedicati.
4. Introdurre test: unit domain + integration API.
5. Versionare migrazioni dati (schema registry + seed).

