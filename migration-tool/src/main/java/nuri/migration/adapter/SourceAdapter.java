package nuri.migration.adapter;

import nuri.migration.discovery.CatalogSnapshot;
import nuri.migration.discovery.DiscoveryRequest;
import nuri.migration.discovery.DiscoveryScope;
import nuri.migration.discovery.ObjectKind;

import java.sql.Connection;
import java.sql.DatabaseMetaData;
import java.sql.SQLException;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;

/** 소스 DB별 객체 discovery SPI. 구현은 소스에 DDL/DML을 실행하지 않아야 한다. */
public interface SourceAdapter {

    String id();

    boolean supports(DatabaseMetaData metadata) throws SQLException;

    CatalogSnapshot discover(Connection connection, DiscoveryRequest request) throws SQLException;

    /** 기존 3-method 구현체를 깨지 않는 보수적 기본 identity다. */
    default AdapterIdentity identity() {
        return AdapterIdentity.conservativeDefault(id());
    }

    default AdapterCapabilities capabilities() {
        return AdapterCapabilities.unsupported(identity().evidenceLevel());
    }

    /** 44개 kind 각각의 실제 discovery 종료 경로. */
    default Map<ObjectKind, DiscoveryTerminalRoute> discoveryRoutes() {
        return DiscoveryRouteMatrix.unsupported();
    }

    /** 요청 원문과 adapter별 명시적 비대상을 canonical 44-kind scope manifest로 만든다. */
    default DiscoveryScope discoveryScope(DiscoveryRequest request) {
        Objects.requireNonNull(request, "request");
        Set<ObjectKind> notApplicable = discoveryRoutes().entrySet().stream()
                .filter(entry -> entry.getValue() == DiscoveryTerminalRoute.NOT_APPLICABLE)
                .map(Map.Entry::getKey)
                .collect(java.util.stream.Collectors.toUnmodifiableSet());
        return DiscoveryScope.capture(id(), request, notApplicable, Set.of());
    }

    default SnapshotStrategy snapshotStrategy() {
        return SnapshotStrategy.conservativeDefault(identity().evidenceLevel());
    }

    default DataStreamingStrategy dataStreamingStrategy() {
        return DataStreamingStrategy.conservativeDefault(identity().evidenceLevel());
    }

    /** ETL source connection의 transaction/isolation 계약. 알 수 없는 adapter는 실행하지 않는다. */
    default SourceReadSessionPolicy sourceReadSessionPolicy() {
        return SourceReadSessionPolicy.unsupported(
                identity().evidenceLevel(),
                "generic JDBC cannot prove one consistent source snapshot");
    }

    /** 정의만 제공하며 SourceAdapter 기본 계약은 vendor query를 실행하지 않는다. */
    default List<VendorCatalogQuery> catalogQueries() {
        return List.of();
    }

    /**
     * JDBC metadata와 read-only hint만 읽는 비파괴 preflight다.
     * {@link Connection#isReadOnly()}는 DB 권한 증명이 아니므로 별도 warning을 항상 유지한다.
     */
    default AdapterPreflight preflight(Connection connection, DiscoveryRequest request) throws SQLException {
        Objects.requireNonNull(connection, "connection");
        Objects.requireNonNull(request, "request");
        DatabaseMetaData metadata = connection.getMetaData();
        boolean matches = supports(metadata);
        boolean readOnlySignal = connection.isReadOnly();
        List<PreflightFinding> findings = new ArrayList<>();
        if (!matches) {
            findings.add(new PreflightFinding(
                    PreflightSeverity.BLOCKING,
                    "ADAPTER_PRODUCT_MISMATCH",
                    "selected adapter does not match the JDBC product/version evidence"));
        }
        if (!readOnlySignal) {
            findings.add(new PreflightFinding(
                    PreflightSeverity.BLOCKING,
                    "READ_ONLY_SIGNAL_MISSING",
                    "source connection is not marked read-only; the adapter will not change it automatically"));
        }
        findings.add(new PreflightFinding(
                PreflightSeverity.WARNING,
                "PRIVILEGE_PROOF_REQUIRED",
                "JDBC read-only is only a hint; a database-level SELECT-only privilege census is still required"));
        if (identity().evidenceLevel() != EvidenceLevel.VERIFIED) {
            findings.add(new PreflightFinding(
                    PreflightSeverity.WARNING,
                    "UNVERIFIED_VENDOR_EVIDENCE",
                    "adapter behavior has not been verified against every declared vendor/version"));
        }
        CatalogSnapshot.DatabaseInfo database = new CatalogSnapshot.DatabaseInfo(
                metadata.getDatabaseProductName(),
                metadata.getDatabaseProductVersion(),
                metadata.getDriverName(),
                metadata.getDriverVersion());
        return new AdapterPreflight(identity(), database, matches, readOnlySignal, findings);
    }
}
