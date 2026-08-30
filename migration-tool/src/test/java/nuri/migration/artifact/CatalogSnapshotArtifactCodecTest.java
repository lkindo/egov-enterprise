package nuri.migration.artifact;

import nuri.migration.discovery.CatalogObject;
import nuri.migration.discovery.CatalogSnapshot;
import nuri.migration.discovery.ObjectKind;
import nuri.migration.discovery.SnapshotCapability;
import nuri.migration.discovery.VisibilityFinding;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@DisplayName("versioned catalog inventory JSON artifact")
class CatalogSnapshotArtifactCodecTest {

    private final CatalogSnapshotArtifactCodec codec = new CatalogSnapshotArtifactCodec();

    @Test
    @DisplayName("원본 definition은 hash-only로 저장하고 sanitized snapshot으로 왕복한다")
    void writesDefinitionsAsHashOnlyByDefault() {
        String rawDdl = "CREATE TABLE legacy_user (password varchar(200))";
        CatalogObject object = CatalogObject.withDefinition(
                ObjectKind.TABLE,
                "legacy_db",
                "legacy",
                "legacy_user",
                false,
                rawDdl,
                List.of(),
                Map.of("owner", "legacy_owner"));
        CatalogSnapshot original = snapshot(Instant.parse("2026-08-30T00:00:00Z"), List.of(object));

        String artifact = codec.write(original);
        CatalogSnapshot restored = codec.read(artifact);

        assertThat(artifact)
                .doesNotContain(rawDdl)
                .doesNotContain("nativeDefinition")
                .contains(CatalogObject.definitionHash(rawDdl));
        assertThat(restored.discoveredAt()).isEqualTo(original.discoveredAt());
        assertThat(restored.objects()).singleElement().satisfies(restoredObject -> {
            assertThat(restoredObject.nativeDefinition()).isNull();
            assertThat(restoredObject.definitionHash()).isEqualTo(CatalogObject.definitionHash(rawDdl));
            assertThat(restoredObject.attributes()).containsEntry("owner", "legacy_owner");
        });
    }

    @Test
    @DisplayName("discoveredAt은 payload 무결성에는 포함하지만 semantic inventory digest에서는 제외한다")
    void excludesDiscoveryClockOnlyFromSemanticDigest() {
        CatalogObject object = object("legacy_user");
        CatalogSnapshot early = snapshot(Instant.parse("2024-01-01T00:00:00Z"), List.of(object));
        CatalogSnapshot late = snapshot(Instant.parse("2030-01-01T00:00:00Z"), List.of(object));

        CatalogSnapshotArtifactEnvelope earlyEnvelope = codec.readEnvelope(codec.write(early));
        CatalogSnapshotArtifactEnvelope lateEnvelope = codec.readEnvelope(codec.write(late));

        assertThat(lateEnvelope.semanticDigest()).isEqualTo(earlyEnvelope.semanticDigest());
        assertThat(lateEnvelope.payloadDigest()).isNotEqualTo(earlyEnvelope.payloadDigest());
    }

    @Test
    @DisplayName("객체 요청 순서가 달라도 canonical inventory digest가 같다")
    void objectOrderDoesNotChangeSemanticDigest() {
        CatalogObject a = object("a_table");
        CatalogObject z = object("z_table");

        String left = codec.readEnvelope(codec.write(snapshot(
                Instant.parse("2026-08-30T00:00:00Z"), List.of(a, z)))).semanticDigest();
        String right = codec.readEnvelope(codec.write(snapshot(
                Instant.parse("2026-08-30T00:00:00Z"), List.of(z, a)))).semanticDigest();

        assertThat(right).isEqualTo(left);
    }

    @Test
    @DisplayName("동일 이름의 table-scoped 객체도 canonical artifact에서 각각 보존한다")
    void sameNamedTableScopedObjectsRemainDistinctAndCanonical() {
        CatalogObject customerPk = tableScopedConstraint("CUSTOMER");
        CatalogObject orderPk = tableScopedConstraint("ORDER_HEADER");
        Instant discoveredAt = Instant.parse("2026-08-30T00:00:00Z");

        String left = codec.write(snapshot(discoveredAt, List.of(customerPk, orderPk)));
        String right = codec.write(snapshot(discoveredAt, List.of(orderPk, customerPk)));
        CatalogSnapshot restored = codec.read(left);

        assertThat(right).isEqualTo(left);
        assertThat(restored.objects())
                .hasSize(2)
                .extracting(CatalogObject::stableId)
                .doesNotHaveDuplicates();
    }

    @Test
    @DisplayName("source driver evidence는 snapshot 의미와 함께 결속되고 원문 class/JAR 정보는 저장하지 않는다")
    void bindsDriverEvidenceAndRejectsEvidenceTampering() {
        CatalogSnapshot source = snapshot(
                Instant.parse("2026-08-30T00:00:00Z"), List.of(object("legacy_user")));
        String firstJarDigest = "a".repeat(64);
        String secondJarDigest = "b".repeat(64);
        SourceDriverEvidence first = SourceDriverEvidence.isolated(
                "vendor.jdbc.Driver", List.of(firstJarDigest, secondJarDigest));
        SourceDriverEvidence reordered = SourceDriverEvidence.isolated(
                "vendor.jdbc.Driver", List.of(secondJarDigest, firstJarDigest));

        String artifact = codec.write(source, first);
        CatalogSnapshotArtifactEnvelope envelope = codec.readEnvelope(artifact);
        String reorderedDigest = codec.readEnvelope(codec.write(source, reordered)).semanticDigest();

        assertThat(envelope.sourceDriverEvidence()).isEqualTo(first);
        assertThat(envelope.semanticDigest()).isNotEqualTo(reorderedDigest);
        assertThat(artifact).doesNotContain(
                "vendor.jdbc.Driver", firstJarDigest, secondJarDigest);

        String tampered = artifact.replace(
                first.aggregateDigest(), "c".repeat(first.aggregateDigest().length()));
        assertThatThrownBy(() -> codec.readEnvelope(tampered))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("semantic digest");
    }

    @Test
    @DisplayName("payload 변조는 SHA-256 검증에서 차단한다")
    void rejectsTamperedInventoryPayload() {
        String artifact = codec.write(snapshot(
                Instant.parse("2026-08-30T00:00:00Z"), List.of(object("legacy_user"))));
        String tampered = artifact.replace("legacy_user", "legacy_admin");

        assertThatThrownBy(() -> codec.read(tampered))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("digest");
    }

    @Test
    @DisplayName("URL/password/credential은 inventory 자유 속성에서도 artifact 생성을 차단한다")
    void rejectsCredentialsInInventoryAttributes() {
        CatalogObject unsafe = new CatalogObject(
                ObjectKind.TABLE,
                "legacy_db",
                "legacy",
                "legacy_user",
                false,
                null,
                "sha256:" + "d".repeat(64),
                List.of(),
                Map.of("sourceUrl", "jdbc:postgresql://internal/legacy"));

        assertThatThrownBy(() -> codec.write(snapshot(
                Instant.parse("2026-08-30T00:00:00Z"), List.of(unsafe))))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("민감");
    }

    @Test
    @DisplayName("원문과 definitionHash가 불일치하면 원문을 버리기 전에 차단한다")
    void rejectsMismatchedDefinitionHash() {
        CatalogObject inconsistent = new CatalogObject(
                ObjectKind.VIEW,
                "legacy_db",
                "legacy",
                "legacy_view",
                false,
                "SELECT 1",
                "sha256:" + "0".repeat(64),
                List.of(),
                Map.of());

        assertThatThrownBy(() -> codec.write(snapshot(
                Instant.parse("2026-08-30T00:00:00Z"), List.of(inconsistent))))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("definitionHash");
    }

    private static CatalogObject object(String name) {
        return CatalogObject.hashOnlyDefinition(
                ObjectKind.TABLE,
                "legacy_db",
                "legacy",
                name,
                false,
                "CREATE TABLE " + name + " (id bigint)",
                List.of(),
                Map.of());
    }

    private static CatalogObject tableScopedConstraint(String table) {
        return new CatalogObject(
                ObjectKind.PRIMARY_KEY,
                "legacy_db",
                "legacy",
                "PK_SHARED",
                false,
                null,
                null,
                List.of(new CatalogObject.ObjectReference(
                        ObjectKind.TABLE, "legacy_db", "legacy", table)),
                Map.of("parentTable", table, "columns", "ID"));
    }

    private static CatalogSnapshot snapshot(Instant discoveredAt, List<CatalogObject> objects) {
        return new CatalogSnapshot(
                CatalogSnapshot.CURRENT_SCHEMA_VERSION,
                discoveredAt,
                new CatalogSnapshot.DatabaseInfo("PostgreSQL", "17", "pgjdbc", "42"),
                new CatalogSnapshot.EnvironmentInfo("legacy_db", "legacy", "UTF-8", "C", "UTC"),
                new SnapshotCapability(true, true, "exported-snapshot"),
                objects,
                List.<VisibilityFinding>of());
    }
}
