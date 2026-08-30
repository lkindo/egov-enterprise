package nuri.migration.adapter;

import nuri.migration.discovery.CatalogSnapshot;

import java.util.List;
import java.util.Objects;

/** adapter 선택과 read-only 신호를 확인한 결과. 실제 권한 census의 대체물이 아니다. */
public record AdapterPreflight(
        AdapterIdentity identity,
        CatalogSnapshot.DatabaseInfo database,
        boolean adapterMatches,
        boolean connectionReadOnlySignal,
        List<PreflightFinding> findings) {

    public AdapterPreflight {
        identity = Objects.requireNonNull(identity, "identity");
        database = Objects.requireNonNull(database, "database");
        findings = List.copyOf(Objects.requireNonNull(findings, "findings"));
    }

    public boolean hasBlockingFindings() {
        return findings.stream().anyMatch(finding -> finding.severity() == PreflightSeverity.BLOCKING);
    }
}
