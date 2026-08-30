package nuri.migration;

import nuri.migration.adapter.AdapterIdentity;
import nuri.migration.adapter.AdapterPreflight;
import nuri.migration.adapter.DatabaseFamily;
import nuri.migration.adapter.EvidenceLevel;
import nuri.migration.adapter.PreflightFinding;
import nuri.migration.adapter.PreflightSeverity;
import nuri.migration.adapter.SourceAdapter;
import nuri.migration.adapter.SourceAdapterRegistry;
import nuri.migration.adapter.SourceReadSessionPolicy;
import nuri.migration.artifact.ArtifactFileStore;
import nuri.migration.artifact.CatalogSnapshotArtifactCodec;
import nuri.migration.artifact.CatalogSnapshotDigester;
import nuri.migration.artifact.MappingSpecDigester;
import nuri.migration.artifact.MigrationExecutionContract;
import nuri.migration.artifact.MigrationPlanArtifactCodec;
import nuri.migration.artifact.SourceDriverEvidence;
import nuri.migration.discovery.CatalogObject;
import nuri.migration.discovery.CatalogObject.ObjectReference;
import nuri.migration.discovery.CatalogSnapshot;
import nuri.migration.discovery.DiscoveryRequest;
import nuri.migration.discovery.DiscoveryScope;
import nuri.migration.discovery.ObjectKind;
import nuri.migration.discovery.SnapshotCapability;
import nuri.migration.etl.EtlExecutor;
import nuri.migration.etl.MigrationMode;
import nuri.migration.jdbc.SourceJdbcEndpoint;
import nuri.migration.jdbc.SourceJdbcEndpointFactory;
import nuri.migration.model.MappingLoader;
import nuri.migration.model.MappingSpec;
import nuri.migration.model.MappingSpec.ColumnMapping;
import nuri.migration.model.MappingSpec.DbConfig;
import nuri.migration.model.MappingSpec.RunContext;
import nuri.migration.model.MappingSpec.TableMapping;
import nuri.migration.plan.DispositionDecision;
import nuri.migration.plan.MigrationPlan;
import nuri.migration.plan.MigrationPlanner;
import nuri.migration.plan.ObjectDisposition;
import nuri.migration.postgres.PostgresTargetSchemaFingerprinter;
import nuri.migration.postgres.TargetSchemaFingerprint;
import nuri.migration.source.SourceIntrospector;
import nuri.migration.transform.TransformerRegistry;
import nuri.migration.validate.MappingValidator;
import nuri.migration.validate.ValidationResult;
import nuri.migration.verify.MigrationReport;
import nuri.migration.verify.MigrationVerifier;
import nuri.migration.workflow.WorkflowReviewLoader;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.mockito.ArgumentCaptor;
import org.mockito.InOrder;
import org.springframework.boot.DefaultApplicationArguments;
import org.springframework.jdbc.core.JdbcTemplate;

import javax.sql.DataSource;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.sql.Connection;
import java.sql.DatabaseMetaData;
import java.sql.SQLException;
import java.sql.Types;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.assertj.core.api.Assertions.catchThrowable;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.anyBoolean;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.nullable;
import static org.mockito.BDDMockito.given;
import static org.mockito.BDDMockito.willThrow;
import static org.mockito.Mockito.clearInvocations;
import static org.mockito.Mockito.inOrder;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;

class MigrationWorkflowRunnerTest {

    @TempDir
    Path temp;

    private final MappingLoader loader = mock(MappingLoader.class);
    private final MappingValidator validator = mock(MappingValidator.class);
    private final EtlExecutor executor = mock(EtlExecutor.class);
    private final MigrationVerifier verifier = mock(MigrationVerifier.class);
    private final SourceIntrospector introspector = mock(SourceIntrospector.class);
    private final SourceJdbcEndpointFactory sourceEndpoints = mock(SourceJdbcEndpointFactory.class);
    private final SourceJdbcEndpoint sourceEndpoint = mock(SourceJdbcEndpoint.class);
    private final SourceAdapter adapter = mock(SourceAdapter.class);
    private final JdbcTemplate sourceJdbc = mock(JdbcTemplate.class);
    private final JdbcTemplate targetJdbc = mock(JdbcTemplate.class);
    private final DataSource sourceDataSource = mock(DataSource.class);
    private final DataSource targetDataSource = mock(DataSource.class);
    private final Connection sourceConnection = mock(Connection.class);
    private final Connection targetConnection = mock(Connection.class);
    private final DatabaseMetaData sourceMetadata = mock(DatabaseMetaData.class);
    private final DatabaseMetaData targetMetadata = mock(DatabaseMetaData.class);
    private final PostgresTargetSchemaFingerprinter fingerprinter = mock(PostgresTargetSchemaFingerprinter.class);
    private final ArtifactFileStore files = new ArtifactFileStore();
    private final CatalogSnapshotArtifactCodec inventoryCodec = new CatalogSnapshotArtifactCodec();
    private final MigrationPlanArtifactCodec planCodec = new MigrationPlanArtifactCodec();
    private final MigrationPlanner planner = new MigrationPlanner();
    private final TransformerRegistry transformers = new TransformerRegistry();

    private MigrationWorkflowRunner runner;
    private MappingSpec mapping;
    private CatalogSnapshot snapshot;
    private TargetSchemaFingerprint targetFingerprint;
    private AdapterIdentity experimentalIdentity;
    private SourceDriverEvidence driverEvidence;
    private SourceReadSessionPolicy readSessionPolicy;
    private Path mappingPath;

    @BeforeEach
    void setUp() throws Exception {
        mappingPath = temp.resolve("mapping.yml");
        Files.writeString(mappingPath, "tables: []");
        DbConfig source = new DbConfig(
                "jdbc:h2:mem:workflow-source", "sentinel-source-user", "sentinel-source-password", "driver",
                "sentinel-source-endpoint");
        DbConfig target = new DbConfig(
                "jdbc:postgresql://sentinel-target/db", "sentinel-target-user", "sentinel-target-password", "driver",
                "sentinel-target-endpoint");
        TableMapping table = new TableMapping(
                "legacy.legacy_user", "public.tb_user_info", null, "USER_ID", "user_id",
                List.of(new ColumnMapping("USER_ID", "user_id", null, null, null, null, null)), null);
        mapping = new MappingSpec(
                source, target, List.of(table), Map.of(), new RunContext("workflow-run", "legacy-source"));
        snapshot = snapshot(List.of(
                object(ObjectKind.TABLE, "legacy_user"),
                columnObject("legacy_user", "USER_ID", Types.VARCHAR)));
        targetFingerprint = targetFingerprint("e");
        experimentalIdentity = identity(EvidenceLevel.EXPERIMENTAL);
        readSessionPolicy = SourceReadSessionPolicy.repeatableRead(
                EvidenceLevel.EXPERIMENTAL, "operator-frozen test snapshot");
        driverEvidence = SourceDriverEvidence.bundled(mapping.source().driver());

        given(loader.loadContent(any(String.class))).willReturn(mapping);
        given(sourceJdbc.getDataSource()).willReturn(sourceDataSource);
        given(targetJdbc.getDataSource()).willReturn(targetDataSource);
        given(sourceDataSource.getConnection()).willReturn(sourceConnection);
        given(targetDataSource.getConnection()).willReturn(targetConnection);
        given(sourceConnection.getMetaData()).willReturn(sourceMetadata);
        given(targetConnection.getMetaData()).willReturn(targetMetadata);
        given(targetMetadata.getDatabaseProductName()).willReturn("PostgreSQL");
        given(introspector.jdbc(mapping.source())).willReturn(sourceJdbc);
        given(introspector.jdbc(mapping.target())).willReturn(targetJdbc);
        given(sourceEndpoints.open(eq(mapping.source()), anyList(), nullable(String.class)))
                .willReturn(sourceEndpoint);
        given(sourceEndpoint.jdbc()).willReturn(sourceJdbc);
        given(sourceEndpoint.dataSource()).willReturn(sourceDataSource);
        given(sourceEndpoint.evidence()).willReturn(driverEvidence);
        given(adapter.id()).willReturn("postgresql-pg-catalog");
        given(adapter.discoveryScope(any(DiscoveryRequest.class))).willAnswer(invocation ->
                scopeFor(invocation.getArgument(0)));
        given(adapter.supports(sourceMetadata)).willReturn(true);
        given(adapter.identity()).willReturn(experimentalIdentity);
        given(adapter.sourceReadSessionPolicy()).willReturn(readSessionPolicy);
        given(adapter.preflight(eq(sourceConnection), any(DiscoveryRequest.class)))
                .willReturn(preflight(experimentalIdentity, List.of()));
        given(adapter.discover(eq(sourceConnection), any(DiscoveryRequest.class))).willReturn(snapshot);
        given(fingerprinter.fingerprint(targetConnection, mapping)).willReturn(targetFingerprint);
        given(validator.validate(mapping)).willReturn(pass());
        given(validator.validateLiveSource(mapping, sourceJdbc)).willReturn(pass());
        given(validator.validateLiveTarget(mapping, targetJdbc)).willReturn(pass());
        List<EtlExecutor.TableResult> results = List.of(
                new EtlExecutor.TableResult("legacy.legacy_user", "public.tb_user_info", 1, 1, 0, List.of()));
        given(executor.execute(eq(mapping), any(MigrationMode.class), eq(sourceJdbc),
                nullable(JdbcTemplate.class), eq(readSessionPolicy), anyBoolean())).willReturn(results);
        given(verifier.verify(eq(mapping), eq(results), nullable(JdbcTemplate.class)))
                .willReturn(new MigrationReport(List.of(), MigrationReport.Status.PASS));

        runner = new MigrationWorkflowRunner(
                loader, validator, executor, verifier, introspector,
                new SourceAdapterRegistry(List.of(adapter)), files, inventoryCodec, planCodec,
                planner, new WorkflowReviewLoader(), fingerprinter, sourceEndpoints, transformers);
    }

    @Test
    void discoverSetsReadOnlyBeforePreflightAndWritesCanonicalInventory() throws Exception {
        Path inventory = temp.resolve("inventory.json");

        runner.run(args(
                "--command=discover", "--mapping=" + mappingPath,
                "--inventory=" + inventory, "--schemas=legacy,archive"));

        String inventoryArtifact = files.readUtf8(inventory);
        assertThat(CatalogSnapshotDigester.sha256(
                inventoryCodec.read(inventoryArtifact)))
                .isEqualTo(CatalogSnapshotDigester.sha256(snapshot));
        assertThat(inventoryCodec.readEnvelope(inventoryArtifact).sourceEndpointBinding()
                .matches(mapping.source())).isTrue();
        assertThat(inventoryArtifact).doesNotContain(
                mapping.source().url(),
                mapping.source().username(),
                mapping.source().password(),
                mapping.source().endpointId());
        ArgumentCaptor<DiscoveryRequest> request = ArgumentCaptor.forClass(DiscoveryRequest.class);
        InOrder order = inOrder(sourceConnection, adapter);
        order.verify(sourceConnection).setReadOnly(true);
        order.verify(adapter).preflight(eq(sourceConnection), request.capture());
        order.verify(adapter).discover(eq(sourceConnection), any(DiscoveryRequest.class));
        assertThat(request.getValue().schemas()).containsExactlyInAnyOrder("legacy", "archive");
        verify(loader, never()).load(any(Path.class));
    }

    @Test
    void blockingPreflightStopsBeforeDiscoveryOrArtifactWrite() throws Exception {
        Path inventory = temp.resolve("blocked-inventory.json");
        given(adapter.preflight(eq(sourceConnection), any(DiscoveryRequest.class)))
                .willReturn(preflight(experimentalIdentity, List.of(new PreflightFinding(
                        PreflightSeverity.BLOCKING, "READ_ONLY_SIGNAL_MISSING", "blocked"))));

        assertThatThrownBy(() -> runner.run(args(
                "--command=discover", "--mapping=" + mappingPath, "--inventory=" + inventory)))
                .isInstanceOf(MigrationExecutionException.class)
                .hasMessageContaining("preflight");

        assertThat(inventory).doesNotExist();
        verify(adapter, never()).discover(any(), any());
    }

    @Test
    void approvedCommandsRequireCredentialFreeSourceAndTargetEndpointBindings() {
        MappingSpec missingTargetEndpoint = new MappingSpec(
                mapping.source(),
                new DbConfig(
                        mapping.target().url(), mapping.target().username(), mapping.target().password(),
                        mapping.target().driver()),
                mapping.tables(), mapping.codemaps(), mapping.run());
        given(loader.loadContent(any(String.class))).willReturn(missingTargetEndpoint);

        assertThatThrownBy(() -> runner.run(args(
                "--command=discover", "--mapping=" + mappingPath,
                "--inventory=" + temp.resolve("unbound.json"))))
                .isInstanceOf(MigrationExecutionException.class)
                .hasMessageContaining("endpoint");

        verify(sourceEndpoints, never()).open(any(), anyList(), any());
    }

    @Test
    void planAndLoadRejectAChangedSourceUrlEvenWhenTheEndpointLabelIsReusedBeforeAnySideEffect()
            throws Exception {
        Path inventory = temp.resolve("endpoint-inventory.json");
        Path plan = temp.resolve("endpoint-plan.json");
        files.writeAtomic(inventory, inventoryArtifact(snapshot));

        MappingSpec changedEndpoint = new MappingSpec(
                new DbConfig(
                        "jdbc:postgresql://different-source-host/different-db",
                        mapping.source().username(), mapping.source().password(),
                        mapping.source().driver(), mapping.source().endpointId()),
                mapping.target(), mapping.tables(), mapping.codemaps(), mapping.run());
        given(loader.loadContent(any(String.class))).willReturn(changedEndpoint);

        assertThatThrownBy(() -> runner.run(args(
                "--command=plan", "--mapping=" + mappingPath,
                "--inventory=" + inventory, "--plan=" + plan)))
                .isInstanceOf(MigrationExecutionException.class)
                .hasMessageContaining("source endpoint");
        assertThat(plan).doesNotExist();
        verify(fingerprinter, never()).fingerprint(any(), any());
        verify(sourceEndpoints, never()).open(any(), anyList(), any());

        given(loader.loadContent(any(String.class))).willReturn(mapping);
        writeApprovedArtifacts(inventory, plan, snapshot, mapping);
        given(loader.loadContent(any(String.class))).willReturn(changedEndpoint);
        clearInvocations(fingerprinter, sourceEndpoints);

        assertThatThrownBy(() -> load(inventory, plan))
                .isInstanceOf(MigrationExecutionException.class)
                .hasMessageContaining("source endpoint");
        verify(fingerprinter, never()).fingerprint(any(), any());
        verify(sourceEndpoints, never()).open(any(), anyList(), any());
        verify(executor, never()).execute(any(), any(), any(), any(), any(), anyBoolean());
    }

    @Test
    void planConnectsStableIdReviewDecisionsAndWritesBlockedDraftWithoutReview() throws Exception {
        CatalogObject view = object(ObjectKind.VIEW, "legacy_view");
        CatalogSnapshot withView = snapshot(List.of(snapshot.objects().getFirst(), view));
        Path inventory = temp.resolve("inventory.json");
        Path blockedPlan = temp.resolve("blocked-plan.json");
        Path approvedPlan = temp.resolve("approved-plan.json");
        Path review = temp.resolve("review.yml");
        files.writeAtomic(inventory, inventoryArtifact(withView));

        runner.run(args(
                "--command=plan", "--mapping=" + mappingPath,
                "--inventory=" + inventory, "--plan=" + blockedPlan));
        assertThat(planCodec.read(files.readUtf8(blockedPlan)).commitReady()).isFalse();

        String mappingDigest = MappingSpecDigester.sha256(mapping);
        String executionContractDigest = executionContractDigest(mapping);
        Files.writeString(review, reviewYaml(
                inventoryDigest(withView),
                targetFingerprint.digest(), mappingDigest, executionContractDigest,
                view.stableId()));
        runner.run(args(
                "--command=plan", "--mapping=" + mappingPath,
                "--inventory=" + inventory, "--plan=" + approvedPlan, "--review=" + review));

        MigrationPlan approved = planCodec.read(files.readUtf8(approvedPlan));
        assertThat(approved.commitReady()).isTrue();
        assertThat(approved.mappingDigest()).isEqualTo(mappingDigest);
        assertThat(approved.executionContractDigest()).isEqualTo(executionContractDigest);
        assertThat(files.readUtf8(approvedPlan)).doesNotContain(
                mapping.source().endpointId(), mapping.target().endpointId());
        assertThat(approved.objects()).filteredOn(object -> object.sourceObjectId().equals(view.stableId()))
                .singleElement().extracting(object -> object.disposition())
                .isEqualTo(ObjectDisposition.EXPORT_ONLY);
    }

    @Test
    void planRejectsInvalidMappingBeforeTargetFingerprintOrArtifactWrite() throws Exception {
        Path inventory = temp.resolve("inventory.json");
        Path plan = temp.resolve("invalid-plan.json");
        files.writeAtomic(inventory, inventoryArtifact(snapshot));
        given(validator.validate(mapping))
                .willReturn(new ValidationResult(List.of("invalid identity contract"), List.of()));

        assertThatThrownBy(() -> runner.run(args(
                "--command=plan", "--mapping=" + mappingPath,
                "--inventory=" + inventory, "--plan=" + plan)))
                .isInstanceOf(MigrationExecutionException.class)
                .hasMessageContaining("static mapping");

        assertThat(plan).doesNotExist();
        verify(fingerprinter, never()).fingerprint(any(), any());
    }

    @Test
    void planAndLoadRequireExactCurrentCliDiscoveryScope() throws Exception {
        Path scopedInventory = temp.resolve("scoped-inventory.json");
        Path scopedPlan = temp.resolve("scoped-plan.json");
        DiscoveryRequest legacyOnly = DiscoveryRequest.forSchemas(Set.of("legacy"));
        files.writeAtomic(scopedInventory, inventoryCodec.write(
                snapshot, driverEvidence, scopeFor(legacyOnly), mapping.source()));

        assertThatThrownBy(() -> runner.run(args(
                "--command=plan", "--mapping=" + mappingPath,
                "--inventory=" + scopedInventory, "--plan=" + scopedPlan)))
                .isInstanceOf(MigrationExecutionException.class)
                .hasMessageContaining("scope");
        verify(fingerprinter, never()).fingerprint(any(), any());

        runner.run(args(
                "--command=plan", "--mapping=" + mappingPath,
                "--inventory=" + scopedInventory, "--plan=" + scopedPlan,
                "--schemas=legacy"));
        assertThat(scopedPlan).exists();

        Path inventory = temp.resolve("all-inventory.json");
        Path plan = temp.resolve("all-plan.json");
        writeApprovedArtifacts(inventory, plan, snapshot, mapping);
        assertThatThrownBy(() -> runner.run(args(
                "--command=load", "--mapping=" + mappingPath,
                "--inventory=" + inventory, "--plan=" + plan,
                "--schemas=legacy", "--ack-adapter=postgresql-pg-catalog",
                "--ack-source-freeze")))
                .isInstanceOf(MigrationExecutionException.class)
                .hasMessageContaining("scope");
        verify(executor, never()).execute(any(), any(), any(), any(), any(), anyBoolean());
    }

    @Test
    void reviewFreeTextCannotPersistBoundDatabaseCredentials() throws Exception {
        CatalogObject view = object(ObjectKind.VIEW, "legacy_view");
        CatalogSnapshot withView = snapshot(List.of(snapshot.objects().getFirst(), view));
        Path inventory = temp.resolve("inventory.json");
        Path plan = temp.resolve("credential-plan.json");
        Path review = temp.resolve("review.yml");
        files.writeAtomic(inventory, inventoryArtifact(withView));
        String unsafeReview = reviewYaml(
                inventoryDigest(withView),
                targetFingerprint.digest(),
                MappingSpecDigester.sha256(mapping),
                executionContractDigest(mapping),
                view.stableId()).replace(
                "reviewed export-only object", "sentinel-source-user sentinel-source-password");
        Files.writeString(review, unsafeReview);

        assertThatThrownBy(() -> runner.run(args(
                "--command=plan", "--mapping=" + mappingPath,
                "--inventory=" + inventory, "--plan=" + plan, "--review=" + review)))
                .isInstanceOf(MigrationExecutionException.class);

        assertThat(plan).doesNotExist();
    }

    @Test
    void validateRechecksSemanticsAndRejectsBlockedOrTamperedPlans() throws Exception {
        Path blocked = temp.resolve("blocked.json");
        CatalogSnapshot withView = snapshot(List.of(object(ObjectKind.VIEW, "legacy_view")));
        MigrationPlan blockedPlan = planner.plan(
                withView, new MappingSpec(null, null, List.of(), Map.of()), Map.of(), targetFingerprint.digest());
        files.writeAtomic(blocked, planCodec.write(blockedPlan));

        assertThatThrownBy(() -> runner.run(args("--command=validate", "--plan=" + blocked)))
                .isInstanceOf(MigrationExecutionException.class)
                .hasMessageContaining("commitReady");

        Path approved = temp.resolve("approved.json");
        writeApprovedArtifacts(temp.resolve("unused-inventory.json"), approved, snapshot, mapping);
        Files.writeString(approved, Files.readString(approved).replace("tb_user_info", "tb_admin_info"));
        assertThatThrownBy(() -> runner.run(args("--command=validate", "--plan=" + approved)))
                .isInstanceOf(MigrationExecutionException.class);
    }

    @Test
    void planAndLoadRejectNonPostgresTargetBeforeFingerprinting() throws Exception {
        given(targetMetadata.getDatabaseProductName()).willReturn("H2");
        Path inventory = temp.resolve("inventory.json");
        Path plan = temp.resolve("plan.json");
        files.writeAtomic(inventory, inventoryArtifact(snapshot));

        assertThatThrownBy(() -> runner.run(args(
                "--command=plan", "--mapping=" + mappingPath,
                "--inventory=" + inventory, "--plan=" + plan)))
                .isInstanceOf(MigrationExecutionException.class)
                .hasMessageContaining("PostgreSQL");

        writeApprovedArtifacts(inventory, plan, snapshot, mapping);
        assertThatThrownBy(() -> load(inventory, plan))
                .isInstanceOf(MigrationExecutionException.class)
                .hasMessageContaining("PostgreSQL");
        verify(fingerprinter, never()).fingerprint(any(), any());
    }

    @Test
    void loadDryRunRequiresAllBindingsAndRediscoveryButNeverUsesTargetWriteValidation() throws Exception {
        Path inventory = temp.resolve("inventory.json");
        Path plan = temp.resolve("plan.json");
        writeApprovedArtifacts(inventory, plan, snapshot, mapping);

        runner.run(args(
                "--command=load", "--mapping=" + mappingPath,
                "--inventory=" + inventory, "--plan=" + plan,
                "--ack-adapter=postgresql-pg-catalog", "--ack-source-freeze"));

        verify(adapter).preflight(eq(sourceConnection), any(DiscoveryRequest.class));
        verify(adapter).discover(eq(sourceConnection), any(DiscoveryRequest.class));
        verify(fingerprinter).fingerprint(targetConnection, mapping);
        verify(executor).execute(
                mapping, MigrationMode.DRY_RUN, sourceJdbc, null, readSessionPolicy, true);
        verify(validator, never()).validateLiveTarget(any(), any());
        InOrder lifetime = inOrder(sourceEndpoint, executor);
        lifetime.verify(sourceEndpoint).jdbc();
        lifetime.verify(executor).execute(
                mapping, MigrationMode.DRY_RUN, sourceJdbc, null, readSessionPolicy, true);
        lifetime.verify(sourceEndpoint).close();
    }

    @Test
    void loadDryRunRequiresExactAdapterAndSourceFreezeBeforeLiveDiscovery() throws Exception {
        Path inventory = temp.resolve("inventory.json");
        Path plan = temp.resolve("plan.json");
        writeApprovedArtifacts(inventory, plan, snapshot, mapping);

        assertThatThrownBy(() -> loadWithoutApprovals(inventory, plan))
                .isInstanceOf(MigrationExecutionException.class)
                .hasMessageContaining("ack-adapter");
        verify(adapter, never()).discover(any(), any());

        assertThatThrownBy(() -> loadWithApprovals(
                inventory, plan, false, "postgresql-pg-catalog", MigrationMode.DRY_RUN))
                .isInstanceOf(MigrationExecutionException.class)
                .hasMessageContaining("source-freeze");
        verify(adapter, never()).discover(any(), any());

        assertThatThrownBy(() -> loadWithApprovals(
                inventory, plan, true, "POSTGRESQL-PG-CATALOG", MigrationMode.DRY_RUN))
                .isInstanceOf(MigrationExecutionException.class)
                .hasMessageContaining("exact");
        verify(adapter, never()).discover(any(), any());
        verify(executor, never()).execute(any(), any(), any(), any(), any(), anyBoolean());
    }

    @Test
    void loadFailsClosedWhenSelectedAdapterHasNoReadSessionPolicy() throws Exception {
        Path inventory = temp.resolve("inventory.json");
        Path plan = temp.resolve("plan.json");
        given(adapter.sourceReadSessionPolicy()).willReturn(
                SourceReadSessionPolicy.unsupported(
                        EvidenceLevel.EXPERIMENTAL, "generic snapshot is not defined"));
        writeApprovedArtifacts(inventory, plan, snapshot, mapping);

        assertThatThrownBy(() -> load(inventory, plan))
                .isInstanceOf(MigrationExecutionException.class)
                .hasMessageContaining("unsupported");

        verify(adapter, never()).discover(any(), any());
        verify(executor, never()).execute(any(), any(), any(), any(), any(), anyBoolean());
    }

    @Test
    void loadRejectsMappingSourceAndTargetDriftBeforeExecutor() throws Exception {
        Path inventory = temp.resolve("inventory.json");
        Path plan = temp.resolve("plan.json");
        writeApprovedArtifacts(inventory, plan, snapshot, mapping);

        MappingSpec changedRun = new MappingSpec(
                mapping.source(), mapping.target(), mapping.tables(), mapping.codemaps(),
                new RunContext("different-run", mapping.run().sourceNamespace()));
        given(loader.loadContent(any(String.class))).willReturn(changedRun);
        assertThatThrownBy(() -> load(inventory, plan))
                .isInstanceOf(MigrationExecutionException.class)
                .hasMessageContaining("mappingDigest");

        MappingSpec changedEndpoint = new MappingSpec(
                new DbConfig(
                        mapping.source().url(), mapping.source().username(), mapping.source().password(),
                        mapping.source().driver(), "different-source-endpoint"),
                mapping.target(), mapping.tables(), mapping.codemaps(), mapping.run());
        given(loader.loadContent(any(String.class))).willReturn(changedEndpoint);
        assertThatThrownBy(() -> load(inventory, plan))
                .isInstanceOf(MigrationExecutionException.class)
                .hasMessageContaining("source endpoint");

        MappingSpec changedMapping = new MappingSpec(
                mapping.source(), mapping.target(),
                List.of(new TableMapping(
                        "legacy.legacy_user", "public.tb_changed", null, "USER_ID", "user_id",
                        mapping.tables().getFirst().columns(), null)),
                mapping.codemaps(), mapping.run());
        given(loader.loadContent(any(String.class))).willReturn(changedMapping);
        assertThatThrownBy(() -> load(inventory, plan))
                .isInstanceOf(MigrationExecutionException.class)
                .hasMessageContaining("mappingDigest");

        given(loader.loadContent(any(String.class))).willReturn(mapping);
        CatalogSnapshot changedSource = snapshot(List.of(
                snapshot.objects().getFirst(), object(ObjectKind.TABLE, "unexpected_table")));
        given(adapter.discover(eq(sourceConnection), any(DiscoveryRequest.class))).willReturn(changedSource);
        assertThatThrownBy(() -> load(inventory, plan))
                .isInstanceOf(MigrationExecutionException.class)
                .hasMessageContaining("source inventory");

        given(adapter.discover(eq(sourceConnection), any(DiscoveryRequest.class))).willReturn(snapshot);
        given(fingerprinter.fingerprint(targetConnection, mapping)).willReturn(targetFingerprint("f"));
        assertThatThrownBy(() -> load(inventory, plan))
                .isInstanceOf(MigrationExecutionException.class)
                .hasMessageContaining("target schema");
        verify(executor, never()).execute(any(), any(), any(), any(), any(), anyBoolean());
    }

    @Test
    void loadRejectsDifferentDriverEvidenceBeforeConnectionOrExecutorAndStillClosesEndpoint()
            throws Exception {
        Path inventory = temp.resolve("inventory.json");
        Path plan = temp.resolve("plan.json");
        writeApprovedArtifacts(inventory, plan, snapshot, mapping);
        given(sourceEndpoint.evidence()).willReturn(SourceDriverEvidence.isolated(
                "other.jdbc.Driver", List.of("f".repeat(64))));

        assertThatThrownBy(() -> load(inventory, plan))
                .isInstanceOf(MigrationExecutionException.class)
                .hasMessageContaining("driver evidence");

        verify(sourceDataSource, never()).getConnection();
        verify(executor, never()).execute(any(), any(), any(), any(), any(), anyBoolean());
        verify(sourceEndpoint).close();
    }

    @Test
    void isolatedInProcessDriverNeedsExactEvidenceRiskAckAndCanNeverCommit() throws Exception {
        SourceDriverEvidence isolated = SourceDriverEvidence.isolated(
                "vendor.jdbc.Driver", List.of("a".repeat(64)));
        driverEvidence = isolated;
        given(sourceEndpoint.evidence()).willReturn(isolated);
        Path inventory = temp.resolve("isolated-inventory.json");
        Path plan = temp.resolve("isolated-plan.json");
        writeApprovedArtifacts(inventory, plan, snapshot, mapping);

        assertThatThrownBy(() -> loadWithDriverAck(
                inventory, plan, MigrationMode.DRY_RUN, null))
                .isInstanceOf(MigrationExecutionException.class)
                .hasMessageContaining("driver", "ack");
        assertThatThrownBy(() -> loadWithDriverAck(
                inventory, plan, MigrationMode.DRY_RUN, "b".repeat(64)))
                .isInstanceOf(MigrationExecutionException.class)
                .hasMessageContaining("driver", "ack")
                .hasMessageNotContaining("b".repeat(64));

        assertThatCode(() -> loadWithDriverAck(
                inventory, plan, MigrationMode.DRY_RUN, isolated.aggregateDigest()))
                .doesNotThrowAnyException();

        assertThatThrownBy(() -> loadWithDriverAck(
                inventory, plan, MigrationMode.COMMIT, isolated.aggregateDigest()))
                .isInstanceOf(MigrationExecutionException.class)
                .hasMessageContaining("isolated", "commit");
    }

    @Test
    void loadRecomputesExecutionContractImmediatelyBeforeExecution() throws Exception {
        Path inventory = temp.resolve("contract-inventory.json");
        Path plan = temp.resolve("contract-plan.json");
        writeApprovedArtifacts(inventory, plan, snapshot, mapping);
        given(adapter.sourceReadSessionPolicy()).willReturn(
                SourceReadSessionPolicy.operatorFrozenReadCommitted(
                        EvidenceLevel.EXPERIMENTAL, "changed-policy"));

        assertThatThrownBy(() -> load(inventory, plan))
                .isInstanceOf(MigrationExecutionException.class)
                .hasMessageContaining("execution contract");

        verify(executor, never()).execute(any(), any(), any(), any(), any(), anyBoolean());
    }

    @Test
    void commitBlocksUnverifiedOrMissingExactAcknowledgementsAndAllowsExactExperimentalFreeze() throws Exception {
        Path inventory = temp.resolve("inventory.json");
        Path plan = temp.resolve("plan.json");

        given(adapter.identity()).willReturn(identity(EvidenceLevel.UNVERIFIED));
        writeApprovedArtifacts(inventory, plan, snapshot, mapping);
        assertThatThrownBy(() -> loadCommit(inventory, plan, true, "postgresql-pg-catalog"))
                .isInstanceOf(MigrationExecutionException.class)
                .hasMessageContaining("UNVERIFIED");

        given(adapter.identity()).willReturn(experimentalIdentity);
        writeApprovedArtifacts(inventory, plan, snapshot, mapping);
        assertThatThrownBy(() -> loadCommit(inventory, plan, true, null))
                .isInstanceOf(MigrationExecutionException.class)
                .hasMessageContaining("ack-adapter");
        assertThatThrownBy(() -> loadCommit(inventory, plan, false, "postgresql-pg-catalog"))
                .isInstanceOf(MigrationExecutionException.class)
                .hasMessageContaining("source-freeze");
        assertThatThrownBy(() -> loadCommit(inventory, plan, true, "POSTGRESQL-PG-CATALOG"))
                .isInstanceOf(MigrationExecutionException.class)
                .hasMessageContaining("exact");

        clearInvocations(executor);
        assertThatCode(() -> loadCommit(inventory, plan, true, "postgresql-pg-catalog"))
                .doesNotThrowAnyException();
        verify(validator).validateLiveTarget(mapping, targetJdbc);
        verify(executor).execute(
                mapping, MigrationMode.COMMIT, sourceJdbc, targetJdbc, readSessionPolicy, true);
    }

    @Test
    void workflowFailureNeverLeaksJdbcUserPasswordPathOrUnsafeCause() throws Exception {
        Path inventory = temp.resolve("sentinel-private-path-inventory.json");
        given(adapter.preflight(eq(sourceConnection), any(DiscoveryRequest.class)))
                .willThrow(new SQLException(
                        "jdbc:postgresql://sentinel-host/db sentinel-source-user sentinel-source-password "
                                + mappingPath));

        Throwable failure = catchThrowable(() -> runner.run(args(
                "--command=discover", "--mapping=" + mappingPath, "--inventory=" + inventory)));

        assertThat(failure).isInstanceOf(MigrationExecutionException.class).hasNoCause();
        assertThat(failure.toString())
                .doesNotContain("jdbc:postgresql", "sentinel-host", "sentinel-source-user",
                        "sentinel-source-password", mappingPath.toString());
    }

    @Test
    void nonFatalErrorsAreSanitizedCauseFreeAfterEndpointClose() throws Exception {
        Path inventory = temp.resolve("nonfatal-inventory.json");
        given(adapter.preflight(eq(sourceConnection), any(DiscoveryRequest.class)))
                .willThrow(new LinkageError(
                        "jdbc:private://sentinel sentinel-source-user sentinel-source-password"));

        Throwable failure = catchThrowable(() -> runner.run(args(
                "--command=discover", "--mapping=" + mappingPath,
                "--inventory=" + inventory)));

        assertThat(failure).isInstanceOf(MigrationExecutionException.class).hasNoCause();
        assertThat(failure.toString()).doesNotContain(
                "jdbc:private", "sentinel-source-user", "sentinel-source-password");
        verify(sourceEndpoint).close();
    }

    @Test
    void assertionErrorsAreAlsoSanitizedAndJvmFatalErrorsAreRethrownAfterClose() throws Exception {
        Path inventory = temp.resolve("assertion-inventory.json");
        willThrow(new AssertionError("sentinel-private-assertion"))
                .given(adapter).preflight(eq(sourceConnection), any(DiscoveryRequest.class));

        Throwable assertion = catchThrowable(() -> runner.run(args(
                "--command=discover", "--mapping=" + mappingPath,
                "--inventory=" + inventory)));
        assertThat(assertion).isInstanceOf(MigrationExecutionException.class)
                .hasNoCause()
                .hasMessageNotContaining("sentinel-private-assertion");
        verify(sourceEndpoint).close();

        clearInvocations(sourceEndpoint);
        OutOfMemoryError fatal = new OutOfMemoryError("synthetic-fatal");
        willThrow(fatal).given(adapter)
                .preflight(eq(sourceConnection), any(DiscoveryRequest.class));
        assertThatThrownBy(() -> runner.run(args(
                "--command=discover", "--mapping=" + mappingPath,
                "--inventory=" + temp.resolve("fatal-inventory.json"))))
                .isSameAs(fatal);
        verify(sourceEndpoint).close();

        clearInvocations(sourceEndpoint);
        Throwable threadDeath = (Throwable) Class.forName("java.lang.ThreadDeath")
                .getDeclaredConstructor().newInstance();
        willThrow(threadDeath).given(adapter)
                .preflight(eq(sourceConnection), any(DiscoveryRequest.class));
        assertThatThrownBy(() -> runner.run(args(
                "--command=discover", "--mapping=" + mappingPath,
                "--inventory=" + temp.resolve("thread-death-inventory.json"))))
                .isSameAs(threadDeath);
        verify(sourceEndpoint).close();
    }

    private void load(Path inventory, Path plan) {
        loadWithApprovals(
                inventory, plan, true, "postgresql-pg-catalog", MigrationMode.DRY_RUN);
    }

    private void loadWithoutApprovals(Path inventory, Path plan) {
        runner.run(args(
                "--command=load", "--mapping=" + mappingPath,
                "--inventory=" + inventory, "--plan=" + plan));
    }

    private void loadWithApprovals(
            Path inventory,
            Path plan,
            boolean freeze,
            String acknowledgement,
            MigrationMode mode
    ) {
        java.util.ArrayList<String> values = new java.util.ArrayList<>(List.of(
                "--command=load", "--mapping=" + mappingPath,
                "--inventory=" + inventory, "--plan=" + plan,
                "--mode=" + (mode == MigrationMode.COMMIT ? "commit" : "dry-run")));
        if (freeze) {
            values.add("--ack-source-freeze");
        }
        if (acknowledgement != null) {
            values.add("--ack-adapter=" + acknowledgement);
        }
        runner.run(args(values.toArray(String[]::new)));
    }

    private void loadCommit(Path inventory, Path plan, boolean freeze, String acknowledgement) {
        loadWithApprovals(inventory, plan, freeze, acknowledgement, MigrationMode.COMMIT);
    }

    private void loadWithDriverAck(
            Path inventory,
            Path plan,
            MigrationMode mode,
            String driverAcknowledgement
    ) {
        java.util.ArrayList<String> values = new java.util.ArrayList<>(List.of(
                "--command=load", "--mapping=" + mappingPath,
                "--inventory=" + inventory, "--plan=" + plan,
                "--mode=" + (mode == MigrationMode.COMMIT ? "commit" : "dry-run"),
                "--ack-adapter=postgresql-pg-catalog", "--ack-source-freeze"));
        if (driverAcknowledgement != null) {
            values.add("--ack-source-driver=" + driverAcknowledgement);
        }
        runner.run(args(values.toArray(String[]::new)));
    }

    private void writeApprovedArtifacts(
            Path inventory,
            Path plan,
            CatalogSnapshot sourceSnapshot,
            MappingSpec spec
    ) {
        String inventoryArtifact = inventoryArtifact(sourceSnapshot, spec.source());
        files.writeAtomic(inventory, inventoryArtifact);
        String sourceInventoryDigest = inventoryCodec.readEnvelope(inventoryArtifact).semanticDigest();
        java.util.LinkedHashMap<String, DispositionDecision> decisions = new java.util.LinkedHashMap<>();
        sourceSnapshot.objects().stream()
                .filter(object -> object.kind() == ObjectKind.COLUMN)
                .forEach(column -> decisions.put(
                        column.stableId(),
                        new DispositionDecision(
                                ObjectDisposition.TARGET_OWNED,
                                "public.tb_user_info.user_id",
                                true,
                                "approved mapped column target ownership")));
        MigrationPlan migrationPlan = planner.plan(
                sourceSnapshot, spec, decisions, targetFingerprint.digest(), sourceInventoryDigest,
                executionContractDigest(spec));
        assertThat(migrationPlan.commitReady()).isTrue();
        files.writeAtomic(plan, planCodec.write(migrationPlan));
    }

    private static AdapterIdentity identity(EvidenceLevel evidence) {
        return new AdapterIdentity(
                "postgresql-pg-catalog", DatabaseFamily.POSTGRESQL, "PostgreSQL",
                Set.of("PostgreSQL"), "exact test evidence", evidence);
    }

    private static AdapterPreflight preflight(
            AdapterIdentity identity,
            List<PreflightFinding> findings
    ) {
        return new AdapterPreflight(
                identity,
                new CatalogSnapshot.DatabaseInfo("PostgreSQL", "17", "driver", "1"),
                true,
                true,
                findings);
    }

    private static CatalogSnapshot snapshot(List<CatalogObject> objects) {
        return new CatalogSnapshot(
                CatalogSnapshot.CURRENT_SCHEMA_VERSION,
                Instant.parse("2026-08-30T00:00:00Z"),
                new CatalogSnapshot.DatabaseInfo("PostgreSQL", "17", "driver", "1"),
                new CatalogSnapshot.EnvironmentInfo("db", "legacy", "UTF-8", "C", "UTC"),
                SnapshotCapability.unknown(), objects, List.of());
    }

    private static CatalogObject object(ObjectKind kind, String name) {
        return new CatalogObject(
                kind, "db", "legacy", name, false, null, null, List.of(), Map.of());
    }

    private static CatalogObject columnObject(String table, String column, int jdbcType) {
        return new CatalogObject(
                ObjectKind.COLUMN,
                "db",
                "legacy",
                table + "." + column,
                false,
                null,
                null,
                List.of(new ObjectReference(ObjectKind.TABLE, "db", "legacy", table)),
                Map.of(
                        "parentTable", table,
                        "originalName", column,
                        "jdbcType", Integer.toString(jdbcType)));
    }

    private static TargetSchemaFingerprint targetFingerprint(String digestSeed) {
        TargetSchemaFingerprint generated = TargetSchemaFingerprint.create(
                "PostgreSQL", "17",
                List.of(new TargetSchemaFingerprint.TableMetadata(
                        "db", "public", "tb_user_info", "TABLE",
                        List.of(new TargetSchemaFingerprint.ColumnMetadata(
                                "user_id", Types.VARCHAR, "varchar", 40, 0,
                                DatabaseMetaData.columnNoNulls, null, 1, false, false)),
                        new TargetSchemaFingerprint.PrimaryKeyMetadata(
                                "pk_tb_user_info",
                                List.of(new TargetSchemaFingerprint.PrimaryKeyColumn((short) 1, "user_id"))))));
        if ("e".equals(digestSeed)) {
            return generated;
        }
        return new TargetSchemaFingerprint(
                generated.schemaVersion(), generated.databaseProduct(), generated.databaseVersion(),
                digestSeed.repeat(64), generated.tables());
    }

    private static String reviewYaml(
            String inventoryDigest,
            String targetDigest,
            String mappingDigest,
            String executionContractDigest,
            String objectId
    ) {
        return """
                schemaVersion: 2
                sourceInventoryDigest: %s
                targetSchemaDigest: %s
                mappingDigest: %s
                executionContractDigest: %s
                decisions:
                  "%s":
                    disposition: EXPORT_ONLY
                    reviewed: true
                    rationale: reviewed export-only object
                """.formatted(
                inventoryDigest, targetDigest, mappingDigest, executionContractDigest, objectId);
    }

    private String executionContractDigest(MappingSpec spec) {
        return MigrationExecutionContract.capture(spec, adapter, transformers).digest();
    }

    private String inventoryArtifact(CatalogSnapshot sourceSnapshot) {
        return inventoryArtifact(sourceSnapshot, mapping.source());
    }

    private String inventoryArtifact(CatalogSnapshot sourceSnapshot, DbConfig sourceEndpoint) {
        return inventoryCodec.write(
                sourceSnapshot, driverEvidence, scopeFor(DiscoveryRequest.allUserObjects()),
                sourceEndpoint);
    }

    private String inventoryDigest(CatalogSnapshot sourceSnapshot) {
        return inventoryCodec.readEnvelope(inventoryArtifact(sourceSnapshot)).semanticDigest();
    }

    private static DiscoveryScope scopeFor(DiscoveryRequest request) {
        return DiscoveryScope.capture(
                "postgresql-pg-catalog", request, Set.of(), Set.of());
    }

    private static ValidationResult pass() {
        return new ValidationResult(List.of(), List.of());
    }

    private static DefaultApplicationArguments args(String... values) {
        return new DefaultApplicationArguments(values);
    }
}
