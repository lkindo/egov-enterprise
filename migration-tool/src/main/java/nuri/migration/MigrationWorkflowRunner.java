package nuri.migration;

import nuri.migration.adapter.AdapterIdentity;
import nuri.migration.adapter.AdapterPreflight;
import nuri.migration.adapter.EvidenceLevel;
import nuri.migration.adapter.ExecutionPolicy;
import nuri.migration.adapter.SourceAdapter;
import nuri.migration.adapter.SourceAdapterRegistry;
import nuri.migration.adapter.SourceReadSessionPolicy;
import nuri.migration.artifact.ArtifactFileStore;
import nuri.migration.artifact.CatalogSnapshotArtifactCodec;
import nuri.migration.artifact.CatalogSnapshotArtifactEnvelope;
import nuri.migration.artifact.CatalogSnapshotDigester;
import nuri.migration.artifact.MappingSpecDigester;
import nuri.migration.artifact.MigrationExecutionContract;
import nuri.migration.artifact.MigrationPlanArtifactCodec;
import nuri.migration.artifact.SourceDriverEvidence;
import nuri.migration.artifact.SourceEndpointBinding;
import nuri.migration.discovery.CatalogSnapshot;
import nuri.migration.discovery.DiscoveryRequest;
import nuri.migration.discovery.DiscoveryScope;
import nuri.migration.etl.EtlExecutor;
import nuri.migration.etl.MigrationMode;
import nuri.migration.jdbc.SourceJdbcEndpoint;
import nuri.migration.jdbc.SourceJdbcEndpointFactory;
import nuri.migration.model.MappingLoader;
import nuri.migration.model.MappingSpec;
import nuri.migration.plan.MigrationPlan;
import nuri.migration.plan.MigrationPlanner;
import nuri.migration.postgres.PostgresTargetSchemaFingerprinter;
import nuri.migration.postgres.TargetSchemaFingerprint;
import nuri.migration.source.SourceIntrospector;
import nuri.migration.transform.TransformerRegistry;
import nuri.migration.validate.MappingValidator;
import nuri.migration.validate.ValidationResult;
import nuri.migration.verify.MigrationReport;
import nuri.migration.verify.MigrationVerifier;
import nuri.migration.workflow.WorkflowReview;
import nuri.migration.workflow.WorkflowReviewLoader;
import nuri.migration.workflow.SourceLoadSurfaceGate;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import javax.sql.DataSource;
import java.nio.charset.StandardCharsets;
import java.sql.Connection;
import java.sql.DatabaseMetaData;
import java.sql.SQLException;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.regex.Pattern;

/** 승인 artifact에 결속된 discover -> plan -> validate -> load 실행 경로. */
@Component
public final class MigrationWorkflowRunner implements ApplicationRunner {

    private static final String POSTGRESQL_PRODUCT = "PostgreSQL";

    private final MappingLoader loader;
    private final MappingValidator validator;
    private final EtlExecutor executor;
    private final MigrationVerifier verifier;
    private final SourceIntrospector introspector;
    private final SourceAdapterRegistry adapters;
    private final ArtifactFileStore files;
    private final CatalogSnapshotArtifactCodec inventoryCodec;
    private final MigrationPlanArtifactCodec planCodec;
    private final MigrationPlanner planner;
    private final WorkflowReviewLoader reviewLoader;
    private final PostgresTargetSchemaFingerprinter targetFingerprinter;
    private final SourceJdbcEndpointFactory sourceEndpoints;
    private final TransformerRegistry transformers;

    @Autowired
    public MigrationWorkflowRunner(
            MappingLoader loader,
            MappingValidator validator,
            EtlExecutor executor,
            MigrationVerifier verifier,
            SourceIntrospector introspector,
            SourceJdbcEndpointFactory sourceEndpoints,
            TransformerRegistry transformers
    ) {
        this(loader, validator, executor, verifier, introspector,
                SourceAdapterRegistry.defaults(),
                new ArtifactFileStore(),
                new CatalogSnapshotArtifactCodec(),
                new MigrationPlanArtifactCodec(),
                new MigrationPlanner(),
                new WorkflowReviewLoader(),
                new PostgresTargetSchemaFingerprinter(),
                sourceEndpoints,
                transformers);
    }

    MigrationWorkflowRunner(
            MappingLoader loader,
            MappingValidator validator,
            EtlExecutor executor,
            MigrationVerifier verifier,
            SourceIntrospector introspector,
            SourceAdapterRegistry adapters,
            ArtifactFileStore files,
            CatalogSnapshotArtifactCodec inventoryCodec,
            MigrationPlanArtifactCodec planCodec,
            MigrationPlanner planner,
            WorkflowReviewLoader reviewLoader,
            PostgresTargetSchemaFingerprinter targetFingerprinter
    ) {
        this(loader, validator, executor, verifier, introspector, adapters, files,
                inventoryCodec, planCodec, planner, reviewLoader, targetFingerprinter,
                new SourceJdbcEndpointFactory(introspector), new TransformerRegistry());
    }

    MigrationWorkflowRunner(
            MappingLoader loader,
            MappingValidator validator,
            EtlExecutor executor,
            MigrationVerifier verifier,
            SourceIntrospector introspector,
            SourceAdapterRegistry adapters,
            ArtifactFileStore files,
            CatalogSnapshotArtifactCodec inventoryCodec,
            MigrationPlanArtifactCodec planCodec,
            MigrationPlanner planner,
            WorkflowReviewLoader reviewLoader,
            PostgresTargetSchemaFingerprinter targetFingerprinter,
            SourceJdbcEndpointFactory sourceEndpoints
    ) {
        this(loader, validator, executor, verifier, introspector, adapters, files,
                inventoryCodec, planCodec, planner, reviewLoader, targetFingerprinter,
                sourceEndpoints, new TransformerRegistry());
    }

    MigrationWorkflowRunner(
            MappingLoader loader,
            MappingValidator validator,
            EtlExecutor executor,
            MigrationVerifier verifier,
            SourceIntrospector introspector,
            SourceAdapterRegistry adapters,
            ArtifactFileStore files,
            CatalogSnapshotArtifactCodec inventoryCodec,
            MigrationPlanArtifactCodec planCodec,
            MigrationPlanner planner,
            WorkflowReviewLoader reviewLoader,
            PostgresTargetSchemaFingerprinter targetFingerprinter,
            SourceJdbcEndpointFactory sourceEndpoints,
            TransformerRegistry transformers
    ) {
        this.loader = Objects.requireNonNull(loader, "loader");
        this.validator = Objects.requireNonNull(validator, "validator");
        this.executor = Objects.requireNonNull(executor, "executor");
        this.verifier = Objects.requireNonNull(verifier, "verifier");
        this.introspector = Objects.requireNonNull(introspector, "introspector");
        this.adapters = Objects.requireNonNull(adapters, "adapters");
        this.files = Objects.requireNonNull(files, "files");
        this.inventoryCodec = Objects.requireNonNull(inventoryCodec, "inventoryCodec");
        this.planCodec = Objects.requireNonNull(planCodec, "planCodec");
        this.planner = Objects.requireNonNull(planner, "planner");
        this.reviewLoader = Objects.requireNonNull(reviewLoader, "reviewLoader");
        this.targetFingerprinter = Objects.requireNonNull(targetFingerprinter, "targetFingerprinter");
        this.sourceEndpoints = Objects.requireNonNull(sourceEndpoints, "sourceEndpoints");
        this.transformers = Objects.requireNonNull(transformers, "transformers");
    }

    @Override
    public void run(ApplicationArguments arguments) {
        if (!arguments.containsOption("command")) {
            return;
        }
        WorkflowCommand command = null;
        try {
            WorkflowCliOptions options = WorkflowCliOptions.parse(arguments);
            command = options.command();
            switch (command) {
                case DISCOVER -> discover(options);
                case PLAN -> plan(options);
                case VALIDATE -> validate(options);
                case LOAD -> load(options);
            }
        } catch (WorkflowGateException failure) {
            throw failure;
        } catch (Throwable failure) {
            rethrowJvmFatal(failure);
            String stage = command == null ? "workflow" : command.name().toLowerCase();
            throw new MigrationExecutionException(
                    stage + " 실패 — 상세정보는 보안상 제거되었습니다.");
        }
    }

    private void discover(WorkflowCliOptions options) throws SQLException {
        MappingSpec mapping = readMapping(options);
        requireSource(mapping);
        requireWorkflowEndpointBindings(mapping);
        DiscoveryRequest request = options.discoveryRequest();
        try (SourceJdbcEndpoint endpoint = openSourceEndpoint(mapping, options)) {
            try (Connection connection = open(endpoint.jdbc())) {
                connection.setReadOnly(true);
                SourceAdapter adapter = adapters.resolve(connection, options.sourceAdapter());
                DiscoveryScope scope = adapter.discoveryScope(request);
                requirePreflight(adapter, connection, scope.effectiveRequest());
                CatalogSnapshot snapshot = adapter.discover(connection, scope.effectiveRequest());
                String artifact = inventoryCodec.write(
                        snapshot, endpoint.evidence(), scope, mapping.source());
                requireNoBoundCredentials(artifact, mapping);
                files.writeAtomic(options.inventory(), artifact);
            }
        }
    }

    private void plan(WorkflowCliOptions options) throws SQLException {
        MappingSpec mapping = readMapping(options);
        requireTarget(mapping);
        requireWorkflowEndpointBindings(mapping);
        CatalogSnapshotArtifactEnvelope inventory = inventoryCodec.readEnvelope(
                files.readUtf8(options.inventory()));
        requireSourceEndpointBinding(
                inventory.sourceEndpointBinding(), mapping.source());
        validateStatic(mapping);
        requireBoundDriverEvidence(inventory.sourceDriverEvidence());
        requireBoundDiscoveryScope(inventory.discoveryScope());
        SourceAdapter plannedAdapter = adapters.byId(inventory.discoveryScope().adapterId());
        DiscoveryRequest currentRequest = options.discoveryRequest();
        DiscoveryScope currentScope = plannedAdapter.discoveryScope(currentRequest);
        if ((options.sourceAdapter() != null
                && !plannedAdapter.id().equals(options.sourceAdapter()))
                || !inventory.discoveryScope().matches(plannedAdapter.id(), currentRequest)
                || !inventory.discoveryScope().equals(currentScope)) {
            throw gate("discovery scope exact binding 불일치로 plan을 중단했습니다.");
        }
        String executionContractDigest = MigrationExecutionContract.capture(
                mapping, plannedAdapter, transformers).digest();
        TargetSchemaFingerprint target = fingerprintTarget(mapping);
        Map<String, nuri.migration.plan.DispositionDecision> decisions = Map.of();
        if (options.review() != null) {
            WorkflowReview review = reviewLoader.load(
                    files.readUtf8(options.review()).getBytes(StandardCharsets.UTF_8));
            review.requireBindings(
                    inventory.semanticDigest(),
                    target.digest(),
                    MappingSpecDigester.sha256(mapping),
                    executionContractDigest);
            decisions = review.decisions();
        }
        MigrationPlan plan = planner.plan(
                inventory.payload().toSnapshot(), mapping, decisions, target.digest(),
                inventory.semanticDigest(), executionContractDigest);
        String artifact = planCodec.write(plan);
        requireNoBoundCredentials(artifact, mapping);
        files.writeAtomic(options.plan(), artifact);
    }

    private void validate(WorkflowCliOptions options) {
        MigrationPlan plan = readWorkflowPlan(options);
        if (!plan.commitReady()) {
            throw gate("plan commitReady=false — blocker를 해소하고 다시 승인해야 합니다.");
        }
    }

    private void load(WorkflowCliOptions options) throws SQLException {
        MappingSpec mapping = readMapping(options);
        requireSource(mapping);
        requireTarget(mapping);
        requireWorkflowEndpointBindings(mapping);
        if (mapping.tables().isEmpty()) {
            throw gate("load할 table mapping이 없습니다.");
        }

        CatalogSnapshotArtifactEnvelope inventory = inventoryCodec.readEnvelope(
                files.readUtf8(options.inventory()));
        requireSourceEndpointBinding(
                inventory.sourceEndpointBinding(), mapping.source());
        requireBoundDriverEvidence(inventory.sourceDriverEvidence());
        requireBoundDiscoveryScope(inventory.discoveryScope());
        MigrationPlan plan = readWorkflowPlan(options);
        if (!plan.commitReady()) {
            throw gate("plan commitReady=false — load를 중단합니다.");
        }
        requireEqual(plan.sourceInventoryDigest(), inventory.semanticDigest(),
                "source inventory digest");
        requireEqual(plan.mappingDigest(), MappingSpecDigester.sha256(mapping),
                "mappingDigest");

        validateStatic(mapping);
        DiscoveryRequest request = options.discoveryRequest();
        try (SourceJdbcEndpoint endpoint = openSourceEndpoint(mapping, options)) {
            requireDriverEvidence(inventory.sourceDriverEvidence(), endpoint.evidence());
            requireExternalDriverApproval(options, endpoint.evidence());
            JdbcTemplate source = endpoint.jdbc();
            SourceReadSessionPolicy readSessionPolicy;
            try (Connection connection = open(source)) {
                connection.setReadOnly(true);
                SourceAdapter adapter = adapters.resolve(connection, options.sourceAdapter());
                DiscoveryScope currentScope = adapter.discoveryScope(request);
                if (!inventory.discoveryScope().matches(adapter.id(), request)
                        || !inventory.discoveryScope().equals(currentScope)) {
                    throw gate("discovery scope exact binding 불일치로 중단했습니다.");
                }
                requirePreflight(adapter, connection, currentScope.effectiveRequest());
                AdapterIdentity identity = adapter.identity();
                requireAdapterIdentity(adapter, identity);
                readSessionPolicy = adapter.sourceReadSessionPolicy();
                requireEqual(
                        plan.executionContractDigest(),
                        MigrationExecutionContract.capture(mapping, adapter, transformers).digest(),
                        "execution contract digest");
                requireLoadApprovals(options, identity, readSessionPolicy);
                List<SourceLoadSurfaceGate.Blocker> surfaceBlockers =
                        SourceLoadSurfaceGate.blockers(
                                inventory.payload().toSnapshot(), mapping, readSessionPolicy);
                if (!surfaceBlockers.isEmpty()) {
                    throw gate("source load surface unsupported: " + surfaceBlockers);
                }
                CatalogSnapshot live = adapter.discover(connection, currentScope.effectiveRequest());
                requireEqual(plan.sourceInventoryDigest(),
                        CatalogSnapshotDigester.sha256(
                                live,
                                endpoint.evidence(),
                                currentScope,
                                mapping.source()),
                        "source inventory digest");
            }

            TargetSchemaFingerprint target = fingerprintTarget(mapping);
            requireEqual(plan.targetSchemaDigest(), target.digest(), "target schema digest");
            executeApproved(
                    mapping,
                    options.mode(),
                    source,
                    readSessionPolicy,
                    options.sourceFreezeAcknowledged());
        }
    }

    private MappingSpec readMapping(WorkflowCliOptions options) {
        String content = files.readUtf8(options.mapping());
        return Objects.requireNonNull(loader.loadContent(content), "mapping");
    }

    private MigrationPlan readWorkflowPlan(WorkflowCliOptions options) {
        MigrationPlan plan = planCodec.read(files.readUtf8(options.plan()));
        if (plan.schemaVersion() != MigrationPlan.CURRENT_SCHEMA_VERSION) {
            throw gate("승인 workflow는 migration plan schema v3가 필요합니다.");
        }
        return plan;
    }

    private TargetSchemaFingerprint fingerprintTarget(MappingSpec mapping) throws SQLException {
        JdbcTemplate target = introspector.jdbc(mapping.target());
        try (Connection connection = open(target)) {
            connection.setReadOnly(true);
            DatabaseMetaData metadata = connection.getMetaData();
            if (!POSTGRESQL_PRODUCT.equals(metadata.getDatabaseProductName())) {
                throw gate("target database product는 정확히 PostgreSQL이어야 합니다.");
            }
            return targetFingerprinter.fingerprint(connection, mapping);
        }
    }

    private AdapterPreflight requirePreflight(
            SourceAdapter adapter,
            Connection connection,
            DiscoveryRequest request
    ) throws SQLException {
        AdapterPreflight preflight = adapter.preflight(connection, request);
        if (!preflight.adapterMatches() || preflight.hasBlockingFindings()) {
            throw gate("source adapter preflight blocking finding으로 중단했습니다.");
        }
        if (!adapter.id().equals(preflight.identity().adapterId())) {
            throw gate("source adapter preflight identity가 선택 adapter와 일치하지 않습니다.");
        }
        return preflight;
    }

    private static void requireAdapterIdentity(SourceAdapter adapter, AdapterIdentity identity) {
        if (!adapter.id().equals(identity.adapterId())) {
            throw gate("source adapter identity가 선택 adapter와 일치하지 않습니다.");
        }
    }

    private static void requireLoadApprovals(
            WorkflowCliOptions options,
            AdapterIdentity identity,
            SourceReadSessionPolicy readSessionPolicy
    ) {
        if (readSessionPolicy == null || !readSessionPolicy.supported()) {
            throw gate("source read session policy is unsupported for the selected adapter.");
        }
        String acknowledgement = options.adapterAcknowledgement();
        if (acknowledgement != null && !identity.adapterId().equals(acknowledgement)) {
            throw gate("--ack-adapter는 선택한 adapter ID와 exact match해야 합니다.");
        }
        if (options.mode() == MigrationMode.COMMIT
                && identity.evidenceLevel() == EvidenceLevel.UNVERIFIED) {
            throw gate("UNVERIFIED source adapter로 commit할 수 없습니다.");
        }
        if ((readSessionPolicy.executionPolicy() == ExecutionPolicy.MANUAL_ONLY
                || (options.mode() == MigrationMode.COMMIT
                && identity.evidenceLevel() == EvidenceLevel.EXPERIMENTAL))
                && !identity.adapterId().equals(acknowledgement)) {
            throw gate("load에는 선택 adapter와 exact match하는 --ack-adapter 승인이 필요합니다.");
        }
        if (readSessionPolicy.sourceFreezeRequired() && !options.sourceFreezeAcknowledged()) {
            throw gate("load에는 --ack-source-freeze maintenance-window 승인이 필요합니다.");
        }
    }

    private void executeApproved(
            MappingSpec mapping,
            MigrationMode mode,
            JdbcTemplate source,
            SourceReadSessionPolicy readSessionPolicy,
            boolean sourceFreezeAcknowledged
    ) {
        requireValid(validator.validateLiveSource(mapping, source), "live source schema");
        JdbcTemplate target = null;
        if (mode == MigrationMode.COMMIT) {
            target = introspector.jdbc(mapping.target());
            requireValid(validator.validateLiveTarget(mapping, target), "live target schema");
        }
        List<EtlExecutor.TableResult> results = executor.execute(
                mapping,
                mode,
                source,
                target,
                readSessionPolicy,
                sourceFreezeAcknowledged);
        MigrationReport report = verifier.verify(mapping, results, target);
        if (!report.ok()) {
            throw gate("migration verification이 PASS가 아니므로 load를 실패 처리합니다.");
        }
    }

    private SourceJdbcEndpoint openSourceEndpoint(
            MappingSpec mapping,
            WorkflowCliOptions options
    ) {
        return sourceEndpoints.open(
                mapping.source(), options.sourceDriverJars(), options.sourceDriverClass());
    }

    private static void requireBoundDriverEvidence(SourceDriverEvidence evidence) {
        if (evidence == null || !evidence.bound()) {
            throw gate("source driver evidence가 결속된 inventory가 필요합니다.");
        }
    }

    private static void requireSourceEndpointBinding(
            SourceEndpointBinding binding,
            MappingSpec.DbConfig sourceEndpoint
    ) {
        if (binding == null || !binding.bound()) {
            throw gate("source endpoint binding이 결속된 inventory가 필요합니다.");
        }
        if (!binding.matches(sourceEndpoint)) {
            throw gate("source endpoint binding 불일치로 중단했습니다.");
        }
    }

    private static void requireBoundDiscoveryScope(DiscoveryScope scope) {
        if (scope == null || !scope.bound()) {
            throw gate("adapter에 결속된 discovery scope가 필요합니다.");
        }
    }

    private static void requireDriverEvidence(
            SourceDriverEvidence expected,
            SourceDriverEvidence actual
    ) {
        if (!Objects.equals(expected, actual)) {
            throw gate("source driver evidence digest 불일치로 중단했습니다.");
        }
    }

    private static void requireExternalDriverApproval(
            WorkflowCliOptions options,
            SourceDriverEvidence evidence
    ) {
        String acknowledgement = options.sourceDriverEvidenceAcknowledgement();
        if (evidence.loadingMode() != SourceDriverEvidence.LoadingMode.ISOLATED) {
            if (acknowledgement != null) {
                throw gate("bundled source driver에는 external driver ack를 사용할 수 없습니다.");
            }
            return;
        }
        if (options.mode() == MigrationMode.COMMIT) {
            throw gate("isolated in-process source driver로 commit할 수 없습니다.");
        }
        if (!Objects.equals(evidence.aggregateDigest(), acknowledgement)) {
            throw gate("isolated source driver load에는 exact evidence digest ack가 필요합니다.");
        }
    }

    private void validateStatic(MappingSpec mapping) {
        requireValid(validator.validate(mapping), "static mapping");
    }

    private static void requireValid(ValidationResult result, String boundary) {
        if (result == null || !result.ok()) {
            throw gate(boundary + " validation 실패로 중단했습니다.");
        }
    }

    private static Connection open(JdbcTemplate jdbc) throws SQLException {
        if (jdbc == null) {
            throw gate("JDBC boundary를 생성하지 못했습니다.");
        }
        DataSource dataSource = jdbc.getDataSource();
        if (dataSource == null) {
            throw gate("JDBC DataSource가 없습니다.");
        }
        Connection connection = dataSource.getConnection();
        if (connection == null) {
            throw gate("JDBC Connection이 없습니다.");
        }
        return connection;
    }

    private static void requireSource(MappingSpec mapping) {
        if (mapping.source() == null) {
            throw gate("mapping.source가 필요합니다.");
        }
    }

    private static void requireTarget(MappingSpec mapping) {
        if (mapping.target() == null) {
            throw gate("mapping.target이 필요합니다.");
        }
    }

    private static void requireWorkflowEndpointBindings(MappingSpec mapping) {
        if (mapping.source() == null || !boundEndpoint(mapping.source().endpointId())
                || mapping.target() == null || !boundEndpoint(mapping.target().endpointId())) {
            throw gate("승인 workflow에는 source/target endpointId binding이 필요합니다.");
        }
    }

    private static boolean boundEndpoint(String endpointId) {
        return endpointId != null && !endpointId.isBlank() && endpointId.equals(endpointId.trim());
    }

    private static void requireEqual(String expected, String actual, String boundary) {
        if (!Objects.equals(expected, actual)) {
            throw gate(boundary + " 불일치로 중단했습니다.");
        }
    }

    private static void requireNoBoundCredentials(String artifact, MappingSpec mapping) {
        requireAbsent(artifact, mapping.source());
        requireAbsent(artifact, mapping.target());
    }

    private static void requireAbsent(String artifact, MappingSpec.DbConfig config) {
        if (config == null) {
            return;
        }
        requireAbsent(artifact, config.url());
        requireAbsent(artifact, config.username());
        requireAbsent(artifact, config.password());
        requireAbsent(artifact, config.endpointId());
    }

    private static void requireAbsent(String artifact, String sensitive) {
        if (sensitive == null || sensitive.isBlank()) {
            return;
        }
        String encoded = sensitive.replace("\\", "\\\\").replace("\"", "\\\"");
        boolean found = sensitive.length() >= 8
                ? artifact.contains(sensitive) || artifact.contains(encoded)
                : Pattern.compile("(?<![\\p{L}\\p{N}_])" + Pattern.quote(encoded)
                        + "(?![\\p{L}\\p{N}_])").matcher(artifact).find();
        if (found) {
            throw gate("database credential이 artifact에 포함될 수 없습니다.");
        }
    }

    private static WorkflowGateException gate(String message) {
        return new WorkflowGateException(message);
    }

    private static void rethrowJvmFatal(Throwable failure) {
        if (failure instanceof VirtualMachineError fatal) {
            throw fatal;
        }
        if ("java.lang.ThreadDeath".equals(failure.getClass().getName())) {
            throw (Error) failure;
        }
    }

    /** 외부 예외와 구분해 검토된 고정 메시지만 원인 없이 통과시킨다. */
    private static final class WorkflowGateException extends MigrationExecutionException {
        private WorkflowGateException(String message) {
            super(message);
        }
    }
}
