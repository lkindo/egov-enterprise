package nuri.migration.artifact;

import com.fasterxml.jackson.databind.ObjectMapper;
import nuri.migration.discovery.ObjectKind;
import nuri.migration.plan.MigrationObjectPlan;
import nuri.migration.plan.MigrationPlan;
import nuri.migration.plan.MigrationPlanValidator;
import nuri.migration.plan.ObjectDisposition;
import nuri.migration.plan.PlanCoverage;
import nuri.migration.plan.PlanReadiness;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.ArrayList;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@DisplayName("versioned migration plan JSON artifact")
class MigrationPlanArtifactCodecTest {

    private final MigrationPlanArtifactCodec codec = new MigrationPlanArtifactCodec();

    @Test
    @DisplayName("canonical JSON envelope는 반복 생성해도 byte와 SHA-256 digest가 같다")
    void producesDeterministicCanonicalEnvelope() {
        MigrationPlan plan = plan(List.of(autoTable("legacy.z_user"), autoTable("legacy.a_user")));

        String first = codec.write(plan);
        String second = codec.write(plan);
        MigrationPlanArtifactEnvelope envelope = codec.readEnvelope(first);

        assertThat(second).isEqualTo(first);
        assertThat(envelope.schemaVersion()).isEqualTo(2);
        assertThat(envelope.artifactType()).isEqualTo("migration-plan");
        assertThat(envelope.digestAlgorithm()).isEqualTo("SHA-256");
        assertThat(envelope.payloadDigest()).matches("[0-9a-f]{64}");
        assertThat(codec.read(first)).isEqualTo(plan);
    }

    @Test
    @DisplayName("입력 객체 순서가 달라도 plan 정규화로 canonical digest가 같다")
    void objectOrderDoesNotChangeDigest() {
        MigrationObjectPlan a = autoTable("legacy.a_user");
        MigrationObjectPlan z = autoTable("legacy.z_user");

        String left = codec.readEnvelope(codec.write(plan(List.of(a, z)))).payloadDigest();
        String right = codec.readEnvelope(codec.write(plan(List.of(z, a)))).payloadDigest();

        assertThat(right).isEqualTo(left);
    }

    @Test
    @DisplayName("payload가 변조되면 digest 검증이 fail-closed한다")
    void rejectsTamperedPayload() {
        String artifact = codec.write(plan(List.of(autoTable("legacy.user"))));
        String tampered = artifact.replace("tb_user_info", "tb_admin_info");

        assertThatThrownBy(() -> codec.read(tampered))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("digest");
    }

    @Test
    @DisplayName("이전 envelope version이나 execution contract 변조는 fail-closed한다")
    void rejectsOldEnvelopeVersionAndExecutionContractTampering() {
        MigrationPlan current = currentPlan(List.of(autoTable("legacy.user")));
        String artifact = codec.write(current);

        assertThatThrownBy(() -> codec.read(artifact.replace(
                "\"schemaVersion\":2}", "\"schemaVersion\":1}")))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("version");
        assertThatThrownBy(() -> codec.read(artifact.replace(
                current.executionContractDigest(), "f".repeat(64))))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("digest");
    }

    @Test
    @DisplayName("source/target JDBC URL과 credential 필드는 artifact 생성 전에 차단한다")
    void rejectsJdbcUrlsAndCredentialFields() throws Exception {
        ObjectMapper json = new ObjectMapper();

        assertThatThrownBy(() -> ArtifactRedactionGuard.assertSafe(json.readTree(
                "{\"sourceUrl\":\"jdbc:postgresql://db/internal\"}")))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("민감");
        assertThatThrownBy(() -> ArtifactRedactionGuard.assertSafe(json.readTree(
                "{\"password\":\"do-not-write-this\"}")))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("민감");
        assertThatThrownBy(() -> ArtifactRedactionGuard.assertSafe(json.readTree(
                "{\"dbPassword\":\"do-not-write-this\"}")))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("민감");
        assertThatThrownBy(() -> ArtifactRedactionGuard.assertSafe(json.readTree(
                "{\"note\":\"jdbc:oracle:thin:@db:1521/service\"}")))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("민감");
    }

    @Test
    @DisplayName("plan의 자유 입력 사유에 credential이 섞여도 artifact에 기록하지 않는다")
    void rejectsSecretsHiddenInRationale() {
        MigrationObjectPlan unsafe = new MigrationObjectPlan(
                "TABLE|legacy_db|legacy|legacy_user",
                ObjectKind.TABLE,
                "legacy.legacy_user",
                ObjectDisposition.APPROVED_IGNORE,
                null,
                true,
                false,
                false,
                "source password=super-secret");

        assertThatThrownBy(() -> codec.write(plan(List.of(unsafe))))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("민감");
    }

    @Test
    @DisplayName("artifact에는 source/target URL·password 필드와 발견 시각이 존재하지 않는다")
    void envelopeContainsNoConnectionsOrClock() {
        String artifact = codec.write(plan(List.of(autoTable("legacy.user"))));

        assertThat(artifact)
                .doesNotContainIgnoringCase("password")
                .doesNotContainIgnoringCase("jdbc:")
                .doesNotContainIgnoringCase("sourceUrl")
                .doesNotContainIgnoringCase("targetUrl")
                .doesNotContainIgnoringCase("discoveredAt");
    }

    @Test
    @DisplayName("plan과 readiness 컬렉션은 생성 후 원본 변경으로 바뀌지 않는다")
    void artifactPayloadIsImmutable() {
        List<MigrationObjectPlan> mutable = new ArrayList<>();
        mutable.add(autoTable("legacy.user"));
        MigrationPlan plan = plan(mutable);
        mutable.clear();

        assertThat(plan.objects()).hasSize(1).isUnmodifiable();
        assertThat(plan.readiness().blockers()).isUnmodifiable();
        assertThat(codec.read(codec.write(plan))).isEqualTo(plan);
    }

    private static MigrationPlan plan(List<MigrationObjectPlan> objects) {
        PlanCoverage coverage = new PlanCoverage(
                objects.size(),
                0,
                (int) objects.stream().filter(object -> object.disposition() == null).count(),
                (int) objects.stream()
                        .filter(object -> object.disposition() == ObjectDisposition.AUTO_DATA_LOAD)
                        .count());
        PlanReadiness readiness = new MigrationPlanValidator().validate(objects, coverage);
        return new MigrationPlan(
                1,
                "b".repeat(64),
                "c".repeat(64),
                "PostgreSQL 17",
                objects,
                coverage,
                readiness);
    }

    private static MigrationPlan currentPlan(List<MigrationObjectPlan> objects) {
        PlanCoverage coverage = coverage(objects);
        PlanReadiness readiness = new MigrationPlanValidator().validate(objects, coverage);
        return new MigrationPlan(
                MigrationPlan.CURRENT_SCHEMA_VERSION,
                "b".repeat(64),
                "c".repeat(64),
                "d".repeat(64),
                "e".repeat(64),
                "PostgreSQL 17",
                objects,
                coverage,
                readiness);
    }

    private static PlanCoverage coverage(List<MigrationObjectPlan> objects) {
        return new PlanCoverage(
                objects.size(),
                0,
                (int) objects.stream().filter(object -> object.disposition() == null).count(),
                (int) objects.stream()
                        .filter(object -> object.disposition() == ObjectDisposition.AUTO_DATA_LOAD)
                        .count());
    }

    private static MigrationObjectPlan autoTable(String sourceQualifiedName) {
        String name = sourceQualifiedName.substring(sourceQualifiedName.lastIndexOf('.') + 1);
        return new MigrationObjectPlan(
                "TABLE|legacy_db|legacy|" + name,
                ObjectKind.TABLE,
                sourceQualifiedName,
                ObjectDisposition.AUTO_DATA_LOAD,
                "tb_user_info",
                true,
                true,
                true,
                "MappingSpec 테이블 매핑");
    }
}
