# Reports API: burn rate condition (fictional runbook)

Owner: reporting-oncall-fictional. Scope: simulated GET /reports/{id} client outcome.
This document demonstrates the required decisions; no real paging destination exists.

1. Confirm window coverage, eligible counts, both burn ratios and target version.
   Missing data is an observation problem, not evidence that requests succeeded.
2. Distinguish incorrect results/timeouts from slow-but-correct outcomes. Compare
   the endpoint indicator with asynchronous completion; HTTP acceptance is not completion.
3. Identify whether errors continue in the short window. A high long window after
   recovery is history, not by itself proof that another mitigation is needed now.
4. Inspect recent releases and dependency signals. Use traces/logs if available;
   absence of a sampled trace does not prove absence of the operation.
5. Choose an authorized reversible mitigation with the incident lead. Do not
   delete state, repeat external effects or change the SLO target to silence a page.
6. Check user outcomes and both windows after mitigation. Record time, evidence,
   decision, owner and follow-up. Escalate according to an actual agreed rota.

The model emits condition states, not notifications. No notification deduplication,
inhibition, repeat intervals, acknowledgement or real operational action is executed.
