# Pass 74 — Legacy census and deletion map

The post-Programme-2 census identified one remaining production source dependency on the legacy Keep compatibility path and one remaining production source dependency on the Google compatibility façade.

`src/lib/workspaceTools.ts` previously imported Google Docs/Drive operations from `src/lib/googleApi.ts` and local reference-archive operations from `src/legacy/googleKeepArchive.ts`. The Google operations now use the canonical Google service modules, and the archive operations use `src/services/referenceArchiveService.ts` directly.

The compatibility Keep shim has therefore been physically deleted. The historical local archive storage key remains owned by `referenceArchiveService` so existing data is not silently orphaned.

The legacy Google façade remains in `src/lib/googleApi.ts` only for compatibility exports used elsewhere; its OAuth authority was removed in Pass 66. It is a later deletion candidate only where a repository-wide consumer census proves no external or internal compatibility imports remain.
