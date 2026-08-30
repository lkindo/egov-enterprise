package nuri.migration.artifact;

import nuri.migration.adapter.AdapterIdentity;
import nuri.migration.adapter.DatabaseFamily;
import nuri.migration.adapter.EvidenceLevel;
import nuri.migration.adapter.SourceAdapter;
import nuri.migration.adapter.SourceReadSessionPolicy;
import nuri.migration.model.MappingSpec;
import nuri.migration.model.MappingSpec.ColumnMapping;
import nuri.migration.model.MappingSpec.TableMapping;
import nuri.migration.transform.TransformerRegistry;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.Map;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.mock;

class MigrationExecutionContractTest {

    @TempDir
    Path temp;

    @Test
    void deterministicallyBindsCoreBytesSelectedAdapterPolicyAndUsedTransformers() {
        MappingSpec mapping = mapping("trim");
        TransformerRegistry transformers = new TransformerRegistry();
        SourceAdapter adapter = adapter(SourceReadSessionPolicy.repeatableRead(
                EvidenceLevel.EXPERIMENTAL, "operator-frozen-v1"));

        MigrationExecutionContract first = MigrationExecutionContract.capture(
                mapping, adapter, transformers);
        MigrationExecutionContract second = MigrationExecutionContract.capture(
                mapping, adapter, transformers);
        MigrationExecutionContract changedPolicy = MigrationExecutionContract.capture(
                mapping,
                adapter(SourceReadSessionPolicy.operatorFrozenReadCommitted(
                        EvidenceLevel.EXPERIMENTAL, "operator-frozen-v2")),
                transformers);

        assertThat(first.schemaVersion()).isEqualTo(MigrationExecutionContract.CURRENT_SCHEMA_VERSION);
        assertThat(first.moduleImplementationDigest()).matches("[0-9a-f]{64}");
        assertThat(first.coreClassDigests()).containsKeys(
                "nuri.migration.etl.EtlExecutor",
                "nuri.migration.transform.TypeConverter",
                "nuri.migration.validate.MappingValidator",
                "nuri.migration.verify.MigrationVerifier",
                "nuri.migration.workflow.SourceLoadSurfaceGate");
        assertThat(MigrationExecutionContract.implementationClassNamesForTesting())
                .contains(
                        "nuri/migration/etl/TableOrderer.class",
                        "nuri/migration/keymap/KeyMapRegistry.class",
                        "nuri/migration/state/MigrationStateStore.class",
                        "nuri/migration/identity/JdbcTypedValueCodec.class",
                        "nuri/migration/postgres/PostgresSqlBuilder.class",
                        "nuri/migration/state/RowChecksum.class");
        assertThat(first.digest()).matches("[0-9a-f]{64}");
        assertThat(second.digest()).isEqualTo(first.digest());
        assertThat(changedPolicy.digest()).isNotEqualTo(first.digest());
    }

    @Test
    void usedCustomTransformerMustHaveExplicitVersionAndImplementationDigest() {
        TransformerRegistry unversioned = new TransformerRegistry();
        unversioned.register("sentinel-private-transform", value -> value);

        assertThatThrownBy(() -> MigrationExecutionContract.capture(
                mapping("sentinel-private-transform"), adapter(SourceReadSessionPolicy.repeatableRead(
                        EvidenceLevel.EXPERIMENTAL, "test")), unversioned))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("version")
                .hasMessageNotContaining("sentinel-private-transform");

        // An unversioned extension that is not selected by this MappingSpec cannot affect execution.
        assertThat(MigrationExecutionContract.capture(
                mapping("trim"), adapter(SourceReadSessionPolicy.repeatableRead(
                        EvidenceLevel.EXPERIMENTAL, "test")), unversioned).digest())
                .matches("[0-9a-f]{64}");

        TransformerRegistry versioned = new TransformerRegistry();
        versioned.register(
                "sentinel-private-transform", "contract-v1", "a".repeat(64), value -> value);
        String v1 = MigrationExecutionContract.capture(
                mapping("sentinel-private-transform"), adapter(SourceReadSessionPolicy.repeatableRead(
                        EvidenceLevel.EXPERIMENTAL, "test")), versioned).digest();

        TransformerRegistry changed = new TransformerRegistry();
        changed.register(
                "sentinel-private-transform", "contract-v2", "b".repeat(64), value -> value);
        String v2 = MigrationExecutionContract.capture(
                mapping("sentinel-private-transform"), adapter(SourceReadSessionPolicy.repeatableRead(
                        EvidenceLevel.EXPERIMENTAL, "test")), changed).digest();

        assertThat(v2).isNotEqualTo(v1);
    }

    @Test
    void captureAndRecordBoundariesRejectMissingOrMismatchedExecutionIdentity() {
        MappingSpec mapping = mapping("trim");
        TransformerRegistry transformers = new TransformerRegistry();
        SourceReadSessionPolicy policy = SourceReadSessionPolicy.repeatableRead(
                EvidenceLevel.EXPERIMENTAL, "test");
        MigrationExecutionContract valid = MigrationExecutionContract.capture(
                mapping, adapter(policy), transformers);

        assertThatThrownBy(() -> new MigrationExecutionContract(
                0, valid.moduleImplementationDigest(), valid.coreClassDigests(),
                valid.adapter(), valid.transformerContractDigest()))
                .isInstanceOf(IllegalArgumentException.class).hasMessageContaining("version");
        assertThatThrownBy(() -> new MigrationExecutionContract(
                1, " ", valid.coreClassDigests(), valid.adapter(), valid.transformerContractDigest()))
                .isInstanceOf(IllegalArgumentException.class).hasMessageContaining("moduleImplementationDigest");
        assertThatThrownBy(() -> new MigrationExecutionContract(
                1, valid.moduleImplementationDigest(), null, valid.adapter(), valid.transformerContractDigest()))
                .isInstanceOf(NullPointerException.class);
        assertThatThrownBy(() -> new MigrationExecutionContract(
                1, valid.moduleImplementationDigest(), valid.coreClassDigests(), null,
                valid.transformerContractDigest()))
                .isInstanceOf(NullPointerException.class);
        assertThatThrownBy(() -> new MigrationExecutionContract(
                1, valid.moduleImplementationDigest(), valid.coreClassDigests(), valid.adapter(), null))
                .isInstanceOf(IllegalArgumentException.class).hasMessageContaining("transformerContractDigest");
        assertThatThrownBy(() -> MigrationExecutionContract.capture(null, adapter(policy), transformers))
                .isInstanceOf(NullPointerException.class);
        assertThatThrownBy(() -> MigrationExecutionContract.capture(mapping, null, transformers))
                .isInstanceOf(NullPointerException.class);
        assertThatThrownBy(() -> MigrationExecutionContract.capture(mapping, adapter(policy), null))
                .isInstanceOf(NullPointerException.class);

        SourceAdapter missingIdentity = mock(SourceAdapter.class);
        given(missingIdentity.identity()).willReturn(null);
        assertThatThrownBy(() -> MigrationExecutionContract.capture(mapping, missingIdentity, transformers))
                .isInstanceOf(NullPointerException.class).hasMessageContaining("adapter identity");

        SourceAdapter missingPolicy = adapter(policy);
        given(missingPolicy.sourceReadSessionPolicy()).willReturn(null);
        assertThatThrownBy(() -> MigrationExecutionContract.capture(mapping, missingPolicy, transformers))
                .isInstanceOf(NullPointerException.class).hasMessageContaining("source read session policy");

        SourceAdapter mismatched = adapter(policy);
        given(mismatched.id()).willReturn("different-adapter-id");
        assertThatThrownBy(() -> MigrationExecutionContract.capture(mapping, mismatched, transformers))
                .isInstanceOf(IllegalStateException.class).hasMessageContaining("identity mismatch");
    }

    @Test
    void explodedDirectoryDigestBindsMigrationResourcesAndRecomputesResourceDrift() throws IOException {
        Path classes = temp.resolve("classes");
        Path resources = temp.resolve("resources");
        Path classFile = classes.resolve("nuri/migration/Example.class");
        Path migrationSql = resources.resolve(
                "db/migration-tool/V1__create_migration_runtime_schema.sql");
        Files.createDirectories(classFile.getParent());
        Files.createDirectories(migrationSql.getParent());
        Files.write(classFile, new byte[] {1, 2, 3});
        Files.writeString(migrationSql, "CREATE TABLE version_a;", StandardCharsets.UTF_8);

        String approved = MigrationExecutionContract.directoryImplementationDigestForTesting(
                classes, resources);
        Files.writeString(migrationSql, "CREATE TABLE version_b;", StandardCharsets.UTF_8);
        String execution = MigrationExecutionContract.directoryImplementationDigestForTesting(
                classes, resources);

        assertThat(approved).matches("[0-9a-f]{64}");
        assertThat(execution).matches("[0-9a-f]{64}");
        assertThat(execution).isNotEqualTo(approved);
    }

    private static MappingSpec mapping(String transformer) {
        TableMapping table = new TableMapping(
                "legacy_user", "tb_user_info", null,
                List.of(new ColumnMapping(
                        "USER_NM", "user_nm", transformer, null, null, null, null)), null);
        return new MappingSpec(null, null, List.of(table), Map.of());
    }

    private static SourceAdapter adapter(SourceReadSessionPolicy policy) {
        SourceAdapter adapter = mock(SourceAdapter.class);
        AdapterIdentity identity = new AdapterIdentity(
                "postgresql-pg-catalog",
                DatabaseFamily.POSTGRESQL,
                "PostgreSQL",
                Set.of("PostgreSQL"),
                "exact test versions",
                EvidenceLevel.EXPERIMENTAL);
        given(adapter.id()).willReturn(identity.adapterId());
        given(adapter.identity()).willReturn(identity);
        given(adapter.sourceReadSessionPolicy()).willReturn(policy);
        return adapter;
    }
}
