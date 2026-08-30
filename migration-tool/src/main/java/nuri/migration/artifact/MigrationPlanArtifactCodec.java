package nuri.migration.artifact;

import nuri.migration.plan.MigrationPlan;
import nuri.migration.plan.MigrationPlanValidator;
import nuri.migration.plan.PlanReadiness;

import java.util.Objects;

/** migration plan을 canonical SHA-256 envelope로 직렬화하고 읽을 때 무결성을 재검증한다. */
public final class MigrationPlanArtifactCodec {

    public static final int CURRENT_ENVELOPE_VERSION = 2;
    public static final String ARTIFACT_TYPE = "migration-plan";
    public static final String DIGEST_ALGORITHM = "SHA-256";

    private final MigrationPlanValidator validator = new MigrationPlanValidator();

    public String write(MigrationPlan plan) {
        Objects.requireNonNull(plan, "plan");
        validatePlanSemantics(plan);
        byte[] payload = CanonicalJsonSupport.bytes(plan);
        ArtifactRedactionGuard.assertSafe(CanonicalJsonSupport.tree(plan));
        MigrationPlanArtifactEnvelope envelope = new MigrationPlanArtifactEnvelope(
                CURRENT_ENVELOPE_VERSION,
                ARTIFACT_TYPE,
                DIGEST_ALGORITHM,
                CanonicalSha256.digest(payload),
                plan);
        return CanonicalJsonSupport.string(envelope);
    }

    public MigrationPlan read(String artifact) {
        return readEnvelope(artifact).payload();
    }

    public MigrationPlanArtifactEnvelope readEnvelope(String artifact) {
        MigrationPlanArtifactEnvelope envelope = CanonicalJsonSupport.read(
                Objects.requireNonNull(artifact, "artifact"),
                MigrationPlanArtifactEnvelope.class);
        validateEnvelope(envelope);
        ArtifactRedactionGuard.assertSafe(CanonicalJsonSupport.tree(envelope.payload()));
        String actualDigest = CanonicalSha256.digest(CanonicalJsonSupport.bytes(envelope.payload()));
        if (!CanonicalSha256.equalsHex(envelope.payloadDigest(), actualDigest)) {
            throw new IllegalArgumentException("migration plan artifact payload digest 불일치");
        }
        validatePlanSemantics(envelope.payload());
        return envelope;
    }

    private static void validateEnvelope(MigrationPlanArtifactEnvelope envelope) {
        if (envelope.schemaVersion() != CURRENT_ENVELOPE_VERSION) {
            throw new IllegalArgumentException("지원하지 않는 migration plan envelope version: "
                    + envelope.schemaVersion());
        }
        if (!ARTIFACT_TYPE.equals(envelope.artifactType())) {
            throw new IllegalArgumentException("잘못된 artifact type: " + envelope.artifactType());
        }
        if (!DIGEST_ALGORITHM.equals(envelope.digestAlgorithm())) {
            throw new IllegalArgumentException("지원하지 않는 digest algorithm: "
                    + envelope.digestAlgorithm());
        }
        if (envelope.payload().schemaVersion() != 1
                && envelope.payload().schemaVersion() != 2
                && envelope.payload().schemaVersion() != MigrationPlan.CURRENT_SCHEMA_VERSION) {
            throw new IllegalArgumentException("지원하지 않는 migration plan schema version: "
                    + envelope.payload().schemaVersion());
        }
    }

    private void validatePlanSemantics(MigrationPlan plan) {
        PlanReadiness recalculated = validator.validate(plan.objects(), plan.coverage());
        if (!plan.readiness().blockers().containsAll(recalculated.blockers())) {
            throw new IllegalArgumentException("migration plan readiness가 객체/coverage 검증 결과와 다릅니다");
        }
    }
}
