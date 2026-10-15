package nuri.migration;

import nuri.migration.adapter.AdapterIdentity;
import nuri.migration.adapter.AdapterPreflight;
import nuri.migration.adapter.EvidenceLevel;
import nuri.migration.adapter.ExecutionPolicy;
import nuri.migration.adapter.SourceAdapter;
import nuri.migration.adapter.SourceAdapterRegistry;
import nuri.migration.adapter.SourceReadSessionPolicy;
import nuri.migration.appscan.AppSourceScanner;
import nuri.migration.appscan.AppUsageReport;
import nuri.migration.archive.ArchiveLocationGuard;
import nuri.migration.archive.ArchiveOutcome;
import nuri.migration.archive.ArchiveRun;
import nuri.migration.artifact.ArtifactFileStore;
import nuri.migration.artifact.CanonicalArtifactDigest;
import nuri.migration.artifact.CatalogSnapshotArtifactCodec;
import nuri.migration.artifact.CatalogSnapshotArtifactEnvelope;
import nuri.migration.artifact.CatalogSnapshotDigester;
import nuri.migration.artifact.CollectionArtifactCodec;
import nuri.migration.artifact.MappingSpecDigester;
import nuri.migration.artifact.MigrationExecutionContract;
import nuri.migration.artifact.MigrationExecutionArtifact;
import nuri.migration.artifact.MigrationPlanArtifactCodec;
import nuri.migration.artifact.SourceDriverEvidence;
import nuri.migration.artifact.SourceEndpointBinding;
import nuri.migration.discovery.CatalogSnapshot;
import nuri.migration.discovery.DiscoveryRequest;
import nuri.migration.discovery.DiscoveryScope;
import nuri.migration.domain.TargetValueGuard;
import nuri.migration.etl.EtlExecutor;
import nuri.migration.etl.MigrationMode;
import nuri.migration.generate.MappingGenerator;
import nuri.migration.jdbc.SourceJdbcEndpoint;
import nuri.migration.jdbc.SourceJdbcEndpointFactory;
import nuri.migration.model.MappingLoader;
import nuri.migration.model.MappingSpec;
import nuri.migration.plan.MigrationPlan;
import nuri.migration.plan.MigrationPlanner;
import nuri.migration.postgres.PostgresCodeGroupReader;
import nuri.migration.postgres.PostgresReconciliationQueries;
import nuri.migration.postgres.PostgresStandardDictionaryReader;
import nuri.migration.postgres.PostgresStandardTermReader;
import nuri.migration.postgres.PostgresTargetSchemaFingerprinter;
import nuri.migration.profile.SourceProfile;
import nuri.migration.profile.SourceProfiler;
import nuri.migration.postgres.TargetSchemaFingerprint;
import nuri.migration.schema.MigrationSchemaManager;
import nuri.migration.source.SourceIntrospector;
import nuri.migration.suggest.LedgerDraftWriter;
import nuri.migration.suggest.StandardDictionary;
import nuri.migration.suggest.SuggestionReport;
import nuri.migration.suggest.TermSuggester;
import nuri.migration.transform.TransformerRegistry;
import nuri.migration.validate.CodeGroupReader;
import nuri.migration.validate.CodeGroupState;
import nuri.migration.validate.CodeSetPrecheck;
import nuri.migration.validate.CodeSetTarget;
import nuri.migration.validate.CodeSetTargets;
import nuri.migration.validate.MappingValidator;
import nuri.migration.validate.ProductCodeBindings;
import nuri.migration.validate.ValidationResult;
import nuri.migration.validate.ledger.TermLedger;
import nuri.migration.validate.ledger.TermLedgerLoader;
import nuri.migration.validate.ledger.TermLedgerValidator;
import nuri.migration.verify.ColumnReplay;
import nuri.migration.verify.MigrationReport;
import nuri.migration.verify.MigrationVerifier;
import nuri.migration.verify.ReconciliationPlan;
import nuri.migration.verify.ReconciliationPlanner;
import nuri.migration.verify.ReconciliationRun;
import nuri.migration.workflow.WorkflowReview;
import nuri.migration.workflow.WorkflowReviewLoader;
import nuri.migration.workflow.SourceLoadSurfaceGate;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import javax.sql.DataSource;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.sql.Connection;
import java.sql.DatabaseMetaData;
import java.sql.SQLException;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.regex.Pattern;

/**
 * 승인 artifact에 결속된 discover -> plan -> validate -> load 실행 경로와 수집·식별 명령(profile·app-scan·term-suggest),
 * 원장에서 mapping 을 만드는 mapping-generate.
 */
@Component
public final class MigrationWorkflowRunner implements ApplicationRunner {

    private static final String POSTGRESQL_PRODUCT = "PostgreSQL";
    private static final int MAX_REPORTED_ERRORS = 20;

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
    private final SourceProfiler profiler = new SourceProfiler();
    private final AppSourceScanner appScanner = new AppSourceScanner();
    private final CollectionArtifactCodec collectionCodec = new CollectionArtifactCodec();
    private final TermLedgerLoader ledgerLoader = new TermLedgerLoader();
    private final TermLedgerValidator ledgerValidator = new TermLedgerValidator();
    private final PostgresStandardTermReader standardTerms = new PostgresStandardTermReader();
    private final PostgresStandardDictionaryReader dictionaryReader = new PostgresStandardDictionaryReader();
    private final LedgerDraftWriter ledgerDrafts = new LedgerDraftWriter();
    /** 제어 스키마 상태 확인(ADR-0029 L3c). 시험은 대역을 넣는다. */
    private MigrationSchemaManager schemaManager = new MigrationSchemaManager();
    /** 대상 공통코드 그룹 읽기(ADR-0029 L4 D7). 시험은 대역을 넣는다. */
    private CodeGroupReader codeGroupReader = new PostgresCodeGroupReader();

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

    /** 시험 전용 — 실제 대상 없이 제어 스키마 상태를 정한다. */
    void schemaManagerForTesting(MigrationSchemaManager manager) {
        this.schemaManager = Objects.requireNonNull(manager, "manager");
    }

    /** 시험 전용 — 실제 대상 없이 공통코드 그룹을 정한다. */
    void codeGroupReaderForTesting(CodeGroupReader reader) {
        this.codeGroupReader = Objects.requireNonNull(reader, "reader");
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
                case PROFILE -> profile(options);
                case APP_SCAN -> appScan(options);
                case TERM_SUGGEST -> termSuggest(options);
                case MAPPING_GENERATE -> mappingGenerate(options);
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

    /**
     * [ADR-0029 L2a] inventory 와 같은 소스·드라이버·scope 인지, discover 뒤 소스가 바뀌지 않았는지(live 재조사 digest)
     * 확인한 뒤에만 행을 읽는다. 읽지 못한 테이블이 있으면 산출물을 쓴 뒤 실패로 끝낸다 — 무엇을 읽었는지는 남긴다.
     */
    private void profile(WorkflowCliOptions options) throws SQLException {
        MappingSpec mapping = readMapping(options);
        requireSource(mapping);
        requireWorkflowEndpointBindings(mapping);
        CatalogSnapshotArtifactEnvelope inventory = inventoryCodec.readEnvelope(
                files.readUtf8(options.inventory()));
        requireSourceEndpointBinding(inventory.sourceEndpointBinding(), mapping.source());
        requireBoundDriverEvidence(inventory.sourceDriverEvidence());
        requireBoundDiscoveryScope(inventory.discoveryScope());
        DiscoveryRequest request = options.discoveryRequest();
        try (SourceJdbcEndpoint endpoint = openSourceEndpoint(mapping, options)) {
            requireDriverEvidence(inventory.sourceDriverEvidence(), endpoint.evidence());
            try (Connection connection = open(endpoint.jdbc())) {
                connection.setReadOnly(true);
                SourceAdapter adapter = adapters.resolve(connection, options.sourceAdapter());
                DiscoveryScope currentScope = adapter.discoveryScope(request);
                if (!inventory.discoveryScope().matches(adapter.id(), request)
                        || !inventory.discoveryScope().equals(currentScope)) {
                    throw gate("discovery scope exact binding 불일치로 profile을 중단했습니다.");
                }
                requirePreflight(adapter, connection, currentScope.effectiveRequest());
                CatalogSnapshot live = adapter.discover(connection, currentScope.effectiveRequest());
                requireEqual(inventory.semanticDigest(),
                        CatalogSnapshotDigester.sha256(live, endpoint.evidence(), currentScope, mapping.source()),
                        "source inventory digest");
                SourceProfile profile = profiler.profile(
                        connection, inventory.payload().toSnapshot(), options.profileRowLimit());
                String artifact = collectionCodec.writeProfile(profile, inventory.semanticDigest());
                requireNoBoundCredentials(artifact, mapping);
                files.writeAtomic(options.profile(), artifact);
                long failed = profile.tables().stream()
                        .filter(table -> "FAILED".equals(table.status())).count();
                if (failed > 0) {
                    throw gate("profile 이 테이블 " + failed + "개를 읽지 못했습니다(산출물의 FAILED 행과 SQLSTATE 참고).");
                }
            }
        }
    }

    /** [ADR-0029 L2a] 레거시 소스 디렉터리를 읽기 전용으로 훑는다. DB 에 접속하지 않는다. */
    private void appScan(WorkflowCliOptions options) throws IOException {
        AppUsageReport report = appScanner.scan(options.appSource());
        files.writeAtomic(options.appUsage(), collectionCodec.writeAppUsage(report));
    }

    /**
     * [ADR-0029 L2b] profile·app-scan 산출물과 대상 DB 의 표준 사전(V2_128 확장)으로 용어 후보를 만든다. 대상 DB 는
     * 읽기만 하고 소스에는 접속하지 않는다. 후보와 원장 초안은 검토의 입력일 뿐 plan·load 의 승인 계보가 아니다.
     */
    private void termSuggest(WorkflowCliOptions options) throws SQLException {
        MappingSpec mapping = readMapping(options);
        requireTarget(mapping);
        CollectionArtifactCodec.ProfileEnvelope profile;
        CollectionArtifactCodec.AppUsageEnvelope usage = null;
        try {
            profile = collectionCodec.readProfile(files.readUtf8(options.profile()));
            if (options.appUsage() != null) {
                usage = collectionCodec.readAppUsage(files.readUtf8(options.appUsage()));
            }
        } catch (IllegalArgumentException invalid) {
            throw gate("수집 산출물을 읽지 못해 term-suggest 를 중단했습니다: " + invalid.getMessage());
        }
        if (profile.payload().profileVersion() != SourceProfile.CURRENT_VERSION) {
            throw gate("프로파일 산출물의 판이 맞지 않습니다(값 모양을 세는 규칙이 바뀌었습니다). profile 을 다시 실행하세요.");
        }
        StandardDictionary dictionary;
        try (Connection connection = open(introspector.jdbc(mapping.target()))) {
            connection.setReadOnly(true);
            dictionary = dictionaryReader.read(connection, options.metaSchema());
        } catch (IllegalStateException | IllegalArgumentException unreadable) {
            throw gate(unreadable.getMessage());
        }
        SuggestionReport report = new TermSuggester(dictionary).suggest(profile.payload(),
                profile.inventorySemanticDigest(), profile.payloadDigest(),
                usage == null ? null : usage.payload(), usage == null ? null : usage.payloadDigest());
        // 두 산출물을 모두 만들고 검사한 뒤에 쓴다 — 초안에서 멈추면 후보만 새로 쓰인 채 남지 않는다.
        String artifact;
        String draft = null;
        String draftValues = null;
        try {
            artifact = collectionCodec.writeSuggestions(report);
            if (options.ledgerDraft() != null) {
                TermLedger ledger = ledgerDrafts.draft(report);
                draft = ledgerDrafts.write(ledger);
                draftValues = ledgerDrafts.values(ledger);
            }
        } catch (IllegalArgumentException refused) {
            throw gate("term-suggest 산출물을 쓰지 않았습니다: " + refused.getMessage());
        }
        requireNoBoundCredentials(artifact, mapping);
        if (draft != null) {
            requireNoBoundCredentials(draftValues, mapping);
        }
        files.writeAtomic(options.suggestions(), artifact);
        if (draft != null) {
            files.writeAtomic(options.ledgerDraft(), draft);
        }
    }

    /**
     * [ADR-0029 L3a-2] 사람이 쓴 skeleton 과 검토한 용어 매핑 원장, 승인 inventory 로 mapping 을 만든다. DB 에 접속하지
     * 않고 접속 자리표시({@code ${NAME}})는 치환하지 않은 채 다시 쓴다. 원장은 만들 mapping 과 같은 디렉터리나 그 아래에
     * 있어야 한다. 만든 mapping 은 plan 이 다시 독립 검증한다 — 생성은 승인이 아니다.
     */
    private void mappingGenerate(WorkflowCliOptions options) {
        String skeleton = files.readUtf8(options.skeleton());
        String ledger = files.readUtf8(options.ledger());
        CatalogSnapshot inventory = inventoryCodec.readEnvelope(files.readUtf8(options.inventory()))
                .payload().toSnapshot();
        String mapping;
        try {
            String ledgerPath = MappingGenerator.ledgerPath(options.mapping(), options.ledger());
            mapping = new MappingGenerator(loader, validator).generate(skeleton, ledger, ledgerPath, inventory);
        } catch (MappingGenerator.Refused refused) {
            throw gate(refused.getMessage());
        }
        files.writeAtomic(options.mapping(), mapping);
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
        TargetSchemaFingerprint target = fingerprintTarget(mapping, options.targetSchemas());
        requireTargetStandard(validator.validateTargetStandard(
                mapping, target, inventory.payload().toSnapshot()));
        requireLedger(options, mapping, inventory.payload().toSnapshot());
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
        java.nio.file.Path archiveDirectory = requireArchiveDirectory(options, mapping);

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

            TargetSchemaFingerprint target = fingerprintTarget(mapping, options.targetSchemas());
            requireEqual(plan.targetSchemaDigest(), target.digest(), "target schema digest");
            requireTargetStandard(validator.validateTargetStandard(
                    mapping, target, inventory.payload().toSnapshot()));
            LedgerContext ledger = requireLedger(options, mapping, inventory.payload().toSnapshot());
            // [ADR-0029 L3b] isolate·완화 컬럼의 값 한계는 위에서 검증한 같은 live 계약으로 정한다.
            Map<String, Map<String, TargetValueGuard.Limit>> rowGuards = validator.rowGuards(
                    mapping, target, inventory.payload().toSnapshot());
            // [ADR-0029 L4 D2·D7] 대사 계획 — 승인 fingerprint(시작 제약 포함)·inventory·원장 문맥으로 만든다. 값은 없다.
            List<CodeSetTarget> codeSets = CodeSetTargets.of(mapping, ledger.ledger(), ledger.terms(),
                    ledger.defaultSchema(), ProductCodeBindings.ALL, ledger.precheck());
            ReconciliationPlan reconciliation = ReconciliationPlanner.plan(
                    mapping, inventory.payload().toSnapshot(), target, codeSets, transformers);
            executeApproved(
                    options.plan(), plan,
                    mapping,
                    options.mode(),
                    source,
                    readSessionPolicy,
                    options.sourceFreezeAcknowledged(),
                    options.controlSchemaUpgradeAcknowledged(),
                    rowGuards,
                    archiveDirectory,
                    reconciliation);
        }
    }

    /**
     * [ADR-0029 L3e] 보관 덤프·격리 키 반출 디렉터리를 연결을 열기 전에 정한다. COMMIT 에 보관 선언이나 isolate 가 있으면
     * {@code --archive-dir} 가 필요하다 — 덤프·격리 키 없이 적재하지 않는다. 디렉터리는 절대 경로이고 링크가 없으며
     * mapping·plan·원장·inventory 파일의 디렉터리와 그 아래, Git 작업 트리 밖이어야 한다. 디렉터리가 없으면 null 이다.
     */
    private static java.nio.file.Path requireArchiveDirectory(WorkflowCliOptions options, MappingSpec mapping) {
        if (options.mode() == MigrationMode.COMMIT && ArchiveRun.required(mapping) && options.archiveDir() == null) {
            throw gate("commit 에서 보관 선언(archives)이나 격리(isolate)가 있으면 --archive-dir 가 필요합니다 — 덤프·격리 키"
                    + " 없이 적재하지 않습니다.");
        }
        if (options.archiveDir() == null) {
            return null;
        }
        List<java.nio.file.Path> inputs = new java.util.ArrayList<>(List.of(
                options.mapping(), options.plan(), options.inventory()));
        MappingSpec.LedgerBinding binding = mapping.ledger();
        if (binding != null && binding.path() != null && !binding.path().isBlank()) {
            try {
                inputs.add(options.mapping().toAbsolutePath().normalize().getParent().resolve(binding.path()));
            } catch (java.nio.file.InvalidPathException invalid) {
                // 원장 선언 검사가 같은 경로를 거부한다.
            }
        }
        try {
            return ArchiveLocationGuard.requireSafeDirectory(options.archiveDir(), inputs);
        } catch (IllegalArgumentException unsafe) {
            throw gate(unsafe.getMessage());
        }
    }

    private MappingSpec readMapping(WorkflowCliOptions options) {
        String content = files.readUtf8(options.mapping());
        try {
            return Objects.requireNonNull(loader.loadContent(content), "mapping");
        } catch (MappingSpec.CodemapFormatException format) {
            // [2026-10-13 DEC-OPS-309] 옛 codemap 형식은 옮겨 쓸 방법을 그대로 보여 준다(고정 문구 + codemap 이름).
            throw gate(format.getMessage());
        }
    }

    private MigrationPlan readWorkflowPlan(WorkflowCliOptions options) {
        MigrationPlan plan = planCodec.read(files.readUtf8(options.plan()));
        if (plan.schemaVersion() != MigrationPlan.CURRENT_SCHEMA_VERSION) {
            throw gate("승인 workflow는 migration plan schema v3가 필요합니다.");
        }
        return plan;
    }

    private TargetSchemaFingerprint fingerprintTarget(MappingSpec mapping, java.util.Set<String> allowedSchemas) throws SQLException {
        JdbcTemplate target = introspector.jdbc(mapping.target());
        try (Connection connection = open(target)) {
            connection.setReadOnly(true);
            DatabaseMetaData metadata = connection.getMetaData();
            if (!POSTGRESQL_PRODUCT.equals(metadata.getDatabaseProductName())) {
                throw gate("target database product는 정확히 PostgreSQL이어야 합니다.");
            }
            return targetFingerprinter.fingerprintBound(connection, mapping, allowedSchemas);
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
            java.nio.file.Path planPath,
            MigrationPlan plan,
            MappingSpec mapping,
            MigrationMode mode,
            JdbcTemplate source,
            SourceReadSessionPolicy readSessionPolicy,
            boolean sourceFreezeAcknowledged,
            boolean controlSchemaUpgradeAcknowledged,
            Map<String, Map<String, TargetValueGuard.Limit>> rowGuards,
            java.nio.file.Path archiveDirectory,
            ReconciliationPlan reconciliationPlan
    ) {
        requireValid(validator.validateLiveSource(mapping, source), "live source schema");
        JdbcTemplate target = null;
        MigrationExecutionArtifact.ControlSchemaRecord controlSchema = null;
        if (mode == MigrationMode.COMMIT) {
            target = introspector.jdbc(mapping.target());
            requireValid(validator.validateLiveTarget(mapping, target), "live target schema");
            // [ADR-0029 L3c] 이미 있는 제어 스키마를 올려야 하면 확인 옵션 없이는 증거도 남기지 않고 시작 전에 멈춘다.
            MigrationSchemaManager.ControlSchemaStatus before = schemaManager.inspect(target);
            if (before.upgradeRequired() && !controlSchemaUpgradeAcknowledged) {
                throw gate(new MigrationSchemaManager.ControlSchemaUpgradeRequired(before.appliedVersion()).getMessage());
            }
            controlSchema = new MigrationExecutionArtifact.ControlSchemaRecord(version(before), null);
        }
        java.nio.file.Path evidence = planPath.resolveSibling(
                planPath.getFileName() + ".load-" + java.util.UUID.randomUUID() + ".json");
        java.time.Instant started = java.time.Instant.now();
        // 증거 경로에 쓰지 못하면 적재를 시작하지 않는다. 중단 시 STARTED는 성공을 뜻하지 않는다.
        writeExecutionEvidence(evidence, plan, mapping, mode, "STARTED", started, null, null, null, controlSchema);
        // [ADR-0029 L3e] COMMIT 은 보관 디렉터리에 덤프·격리 키를 쓴다(파일 머리에 승인 plan·mapping digest). dry-run 은 센다.
        ArchiveRun archives = archiveDirectory == null ? ArchiveRun.counting()
                : ArchiveRun.writing(archiveDirectory, CanonicalArtifactDigest.sha256(plan), plan.mappingDigest());
        // 표의 덤프·격리 키를 최종 이름으로 옮길 때마다 STARTED 증거를 다시 쓴다 — 실행이 강제로 끝나도 옮긴 파일은 어떤
        //   증거에 실린다(옮김과 다시 쓰기 사이에 끝나면 남는 파일은 런북이 다룬다).
        MigrationExecutionArtifact.ControlSchemaRecord startedControlSchema = controlSchema;
        archives.onPublished(outcome -> writeExecutionEvidence(evidence, plan, mapping, mode, "STARTED", started,
                null, null, outcome, startedControlSchema));
        // [ADR-0029 L4 D2·D7] 대사 수집 홀더 — 실행기가 채우고 verifier 가 읽는다. 값은 증거에 실리지 않는다. dry-run 은 대상
        //   질의가 없어 원천 행 수만 판정한다.
        ReconciliationRun reconciliation = ReconciliationRun.of(reconciliationPlan,
                new ColumnReplay(transformers, mapping.codemaps()),
                target == null ? null : new PostgresReconciliationQueries(target));
        MigrationReport report = null;
        List<EtlExecutor.TableResult> results = null;
        try {
            results = executor.execute(
                    mapping, mode, source, target, readSessionPolicy, sourceFreezeAcknowledged, rowGuards, archives,
                    controlSchemaUpgradeAcknowledged, reconciliation);
            report = verifier.verify(mapping, results, target, archives.outcome(), reconciliation);
            if (!report.ok()) {
                throw gate("migration verification이 PASS가 아니므로 load를 실패 처리합니다."
                        + firstFailure(report));
            }
            writeExecutionEvidence(evidence, plan, mapping, mode, "PASS", started, report, results,
                    archives.outcome(), afterControlSchema(controlSchema, target));
        } catch (Throwable failure) {
            rethrowJvmFatal(failure);
            writeExecutionEvidence(evidence, plan, mapping, mode, "FAILED", started, report, results,
                    archives.outcome(), afterControlSchema(controlSchema, target));
            throw failure;
        }
    }

    /** 제어 스키마 버전 표기 — 처음 만드는 대상은 none 이다. */
    private static String version(MigrationSchemaManager.ControlSchemaStatus status) {
        return status.appliedVersion() == null ? "none" : status.appliedVersion();
    }

    /** 실행 뒤 버전을 읽는다. 읽지 못하면 unknown 으로 남긴다 — 원래 실패를 가리지 않는다. */
    private MigrationExecutionArtifact.ControlSchemaRecord afterControlSchema(
            MigrationExecutionArtifact.ControlSchemaRecord before, JdbcTemplate target) {
        if (before == null || target == null) {
            return before;
        }
        String after;
        try {
            after = version(schemaManager.inspect(target));
        } catch (RuntimeException unreadable) {
            after = "unknown";
        }
        return new MigrationExecutionArtifact.ControlSchemaRecord(before.before(), after);
    }

    /**
     * [2026-10-13 DEC-OPS-309] 처음 PASS 가 아닌 테이블과 그 판정을 붙인다. 판정 문구는 테이블·컬럼 이름,
     * 행 순번, 건수, 고정 코드와 키 digest(이 프로세스에서만 쓰는 무작위 키의 HMAC, {@code KeyDiagnostics})로만
     * 만들어지며 행 값·키 원문·예외 원문을 담지 않는다.
     */
    static String firstFailure(MigrationReport report) {
        for (MigrationReport.TableReport table : report.tables()) {
            if (table.status() != MigrationReport.Status.PASS) {
                String detail = " 첫 실패: " + table.source() + " — " + table.note();
                return detail.length() <= 600 ? detail : detail.substring(0, 600) + "…";
            }
        }
        return "";
    }

    private void writeExecutionEvidence(java.nio.file.Path path, MigrationPlan plan, MappingSpec mapping,
            MigrationMode mode, String status, java.time.Instant started, MigrationReport report,
            List<EtlExecutor.TableResult> results, ArchiveOutcome archives,
            MigrationExecutionArtifact.ControlSchemaRecord controlSchema) {
        // 시퀀스 재설정 기록(DEC-OPS-306)도 이름과 결과만 실린다 — 키 값은 실리지 않는다. 보관 덤프(ADR-0029 L3e)는 파일
        //   이름(디렉터리 제외)·행 수·SHA-256·개인정보 모양 수만 실린다. 제어 스키마 버전(ADR-0029 L3c)은 적용 전후만 실린다.
        String artifact = MigrationExecutionArtifact.encode(plan, mode, status, started, report, results, archives,
                controlSchema);
        requireNoBoundCredentials(artifact, mapping);
        files.writeAtomic(path, artifact);
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

    /**
     * 표준 계약 위반은 표·컬럼 이름과 타입·길이만 담으므로 그대로 보여 준다. 행 값·상수·자격은 메시지에 없다.
     */
    private static void requireTargetStandard(ValidationResult result) {
        if (result == null) {
            throw gate("target standard contract validation 결과가 없어 중단했습니다.");
        }
        if (!result.ok()) {
            List<String> shown = result.errors().stream().limit(MAX_REPORTED_ERRORS).toList();
            String more = result.errors().size() > shown.size()
                    ? " (외 " + (result.errors().size() - shown.size()) + "건)" : "";
            throw gate("target standard contract validation 실패로 중단했습니다: "
                    + String.join(" | ", shown) + more);
        }
    }

    /**
     * 원장 검증을 지난 문맥 — 원장, live 표준 용어((schema, 영문약어) 키), 기본 schema, 공통코드 쓰기 전 게이트 결과
     * (ADR-0029 L4 D7). load 가 공통코드 대사 대상을 정하는 데 쓴다.
     */
    private record LedgerContext(TermLedger ledger,
                                 Map<TermLedgerValidator.TermKey, TermLedgerValidator.StandardTermRecord> terms,
                                 String defaultSchema, CodeSetPrecheck.PrecheckResult precheck) {}

    /**
     * [ADR-0029 결정 3, DEC-OPS-312·317] mapping 은 용어 매핑 원장을 선언해야 한다. 그 파일은 mapping 과 같은 디렉터리나
     * 그 아래에 있고 바이트가 선언한 digest 와 같아야 한다. 원장 형식·전이 이력, mapping 과 원장의 inventory 기준 대응
     * (정방향·역방향·소스 단위 완전성·load 일치), codemap, 확정 행의 표준 용어가 live 메타에 있고 폐기되지 않았는지를
     * 본다. 원장 없는 mapping 은 plan·load 하지 않는다(DEC-OPS-317).
     *
     * <p>[ADR-0029 L4 D7, DEC-OPS-325] 같은 읽기 전용 연결에서 mapping 이 쓰는 공통코드 바인딩 컬럼의 그룹을 읽어 쓰기 전
     * 게이트({@link CodeSetPrecheck})를 돈다 — 쓰기 검증 바인딩은 codemap(미매핑 그대로 쓰기 아님)이나 상수로 채우고 그 출력이
     * 사용 중 상세코드여야 한다. 오류는 원장 오류와 같은 목록으로 멈춘다. 공통코드 표를 읽지 못하면 SQLSTATE 만 밝혀 멈춘다.
     */
    private LedgerContext requireLedger(WorkflowCliOptions options, MappingSpec mapping, CatalogSnapshot inventory)
            throws SQLException {
        MappingSpec.LedgerBinding binding = mapping.ledger();
        if (binding == null) {
            throw gate("mapping 은 용어 매핑 원장을 선언해야 합니다 — mapping-generate 로 만드세요");
        }
        if (binding.path() == null || binding.path().isBlank()
                || binding.sha256() == null || !binding.sha256().matches("[0-9a-f]{64}")) {
            throw gate("mapping 의 ledger 선언에는 path 와 소문자 sha256 이 필요합니다.");
        }
        java.nio.file.Path base = options.mapping().toAbsolutePath().normalize().getParent();
        java.nio.file.Path ledgerPath = base.resolve(binding.path()).normalize();
        if (!ledgerPath.startsWith(base) || ledgerPath.equals(base)) {
            throw gate("용어 매핑 원장은 mapping 과 같은 디렉터리나 그 아래에 있어야 합니다.");
        }
        String content = files.readUtf8(ledgerPath);
        if (!binding.sha256().equals(sha256Hex(content.getBytes(StandardCharsets.UTF_8)))) {
            throw gate("용어 매핑 원장 digest 가 mapping 의 선언과 다릅니다.");
        }
        TermLedger ledger;
        try {
            ledger = ledgerLoader.load(content);
        } catch (IllegalArgumentException invalid) {
            throw gate(invalid.getMessage());
        }
        List<String> errors = new java.util.ArrayList<>(ledgerValidator.validate(ledger));
        errors.addAll(ledgerValidator.coverage(ledger, mapping, inventory));
        Map<TermLedgerValidator.TermKey, TermLedgerValidator.StandardTermRecord> terms = new java.util.HashMap<>();
        String defaultSchema;
        CodeSetPrecheck.PrecheckResult precheck;
        try (Connection connection = open(introspector.jdbc(mapping.target()))) {
            connection.setReadOnly(true);
            // schema 를 밝히지 않은 대상 표는 대상 표준 계약(fingerprint)처럼 연결의 현재 schema 로 읽는다.
            String current = connection.getSchema();
            defaultSchema = current == null || current.isBlank() ? TermLedgerValidator.DEFAULT_SCHEMA : current;
            for (Map.Entry<String, java.util.Set<String>> schema
                    : ledgerValidator.confirmedTermsBySchema(ledger, defaultSchema).entrySet()) {
                // [ADR-0029 L3a-2] 같은 영문약어라도 schema 마다 다른 용어다 — schema 와 함께 키로 쓴다.
                standardTerms.read(connection, schema.getKey(), schema.getValue()).forEach((abbreviation, record)
                        -> terms.put(new TermLedgerValidator.TermKey(schema.getKey(), abbreviation), record));
            }
            precheck = codeSetPrecheck(connection, mapping, defaultSchema);
        } catch (IllegalStateException | IllegalArgumentException unreadable) {
            throw gate(unreadable.getMessage());
        }
        errors.addAll(precheck.errors());
        errors.addAll(ledgerValidator.codemaps(ledger, mapping.codemaps(), terms, defaultSchema));
        errors.addAll(ledgerValidator.live(ledger, terms, defaultSchema));
        if (!errors.isEmpty()) {
            List<String> shown = errors.stream().limit(MAX_REPORTED_ERRORS).toList();
            String more = errors.size() > shown.size() ? " (외 " + (errors.size() - shown.size()) + "건)" : "";
            throw gate("용어 매핑 원장 검증 실패로 중단했습니다: " + String.join(" | ", shown) + more);
        }
        return new LedgerContext(ledger, terms, defaultSchema, precheck);
    }

    /**
     * [ADR-0029 L4 D7] mapping 이 쓰는 바인딩 컬럼의 공통코드 그룹을 schema 마다 읽어 쓰기 전 게이트를 돈다. 바인딩 컬럼이
     * 없으면 공통코드 표를 읽지 않는다. 상세코드 값은 메모리에만 두고, 읽기 오류는 SQLSTATE 만 밝힌다.
     */
    private CodeSetPrecheck.PrecheckResult codeSetPrecheck(Connection connection, MappingSpec mapping,
                                                           String defaultSchema) {
        Map<String, java.util.Set<String>> required =
                CodeSetPrecheck.requiredGroups(mapping, ProductCodeBindings.ALL, defaultSchema);
        if (required.isEmpty()) {
            return CodeSetPrecheck.check(mapping, ProductCodeBindings.ALL, Map.of(), defaultSchema);
        }
        Map<String, Map<String, CodeGroupState>> groups = new java.util.LinkedHashMap<>();
        for (Map.Entry<String, java.util.Set<String>> schema : required.entrySet()) {
            try {
                groups.put(schema.getKey(), codeGroupReader.read(connection, schema.getKey(), schema.getValue()));
            } catch (SQLException unreadable) {
                throw gate("공통코드 표를 읽지 못했습니다(SQLSTATE="
                        + (unreadable.getSQLState() == null ? "unknown" : unreadable.getSQLState())
                        + ") — 이관 역할에 tb_com_cd·tb_com_dtl_cd SELECT 가 필요합니다");
            }
        }
        return CodeSetPrecheck.check(mapping, ProductCodeBindings.ALL, groups, defaultSchema);
    }

    private static String sha256Hex(byte[] bytes) {
        try {
            return java.util.HexFormat.of().formatHex(
                    java.security.MessageDigest.getInstance("SHA-256").digest(bytes));
        } catch (java.security.NoSuchAlgorithmException impossible) {
            throw new IllegalStateException(impossible);
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
