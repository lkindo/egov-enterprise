package nuri.migration.artifact;

import com.fasterxml.jackson.databind.JsonNode;
import nuri.migration.appscan.AppUsageReport;
import nuri.migration.profile.SourceProfile;
import nuri.migration.suggest.SuggestionReport;

import java.util.Objects;
import java.util.regex.Pattern;

/**
 * 수집·식별 단계 산출물(ADR-0029 결정 1 — {@code profile}·{@code app-scan}·{@code term-suggest})을 canonical JSON envelope 로 쓰고 읽는다.
 *
 * <p>쓰기 전에 자격 검사({@link ArtifactRedactionGuard#assertSafe})와 개인정보 값 검사
 * ({@link ArtifactRedactionGuard#assertNoPersonalValues})를 모두 지난다. 생성기가 거른 뒤에도 남은 것이 있으면
 * 산출물을 만들지 않는다. 읽을 때는 envelope 형식과 본문 digest 를 다시 확인한다.</p>
 */
public final class CollectionArtifactCodec {

    public static final int CURRENT_ENVELOPE_VERSION = 1;
    public static final String PROFILE_TYPE = "source-profile";
    public static final String APP_USAGE_TYPE = "app-usage";
    public static final String SUGGESTION_TYPE = "term-suggestions";
    public static final String DIGEST_ALGORITHM = "SHA-256";
    private static final Pattern INVENTORY_DIGEST = Pattern.compile("[0-9a-f]{64}");

    /** {@code profile} 산출물. {@code inventorySemanticDigest} 는 이 프로파일이 근거로 삼은 inventory 다. */
    public record ProfileEnvelope(int envelopeVersion, String artifactType, String digestAlgorithm,
                                  String payloadDigest, String inventorySemanticDigest, SourceProfile payload) {}

    /** {@code app-scan} 산출물. 소스 위치는 싣지 않고 소스 루트 아래 상대 경로만 싣는다. */
    public record AppUsageEnvelope(int envelopeVersion, String artifactType, String digestAlgorithm,
                                   String payloadDigest, AppUsageReport payload) {}

    /** {@code term-suggest} 산출물. 입력 결속(inventory·profile·app-usage digest)은 본문이 싣는다. */
    public record SuggestionEnvelope(int envelopeVersion, String artifactType, String digestAlgorithm,
                                     String payloadDigest, SuggestionReport payload) {}

    public String writeProfile(SourceProfile profile, String inventorySemanticDigest) {
        Objects.requireNonNull(profile, "profile");
        if (inventorySemanticDigest == null || !INVENTORY_DIGEST.matcher(inventorySemanticDigest).matches()) {
            throw new IllegalArgumentException("profile 에는 결속된 inventory semantic digest 가 필요합니다");
        }
        requireCollectionSafe(CanonicalJsonSupport.tree(profile));
        ProfileEnvelope envelope = new ProfileEnvelope(CURRENT_ENVELOPE_VERSION, PROFILE_TYPE, DIGEST_ALGORITHM,
                CanonicalSha256.digest(CanonicalJsonSupport.bytes(profile)), inventorySemanticDigest, profile);
        return CanonicalJsonSupport.string(envelope);
    }

    public ProfileEnvelope readProfile(String artifact) {
        ProfileEnvelope envelope = CanonicalJsonSupport.read(Objects.requireNonNull(artifact, "artifact"),
                ProfileEnvelope.class);
        requireEnvelope(envelope.envelopeVersion(), envelope.artifactType(), PROFILE_TYPE,
                envelope.digestAlgorithm(), envelope.payload());
        if (envelope.inventorySemanticDigest() == null
                || !INVENTORY_DIGEST.matcher(envelope.inventorySemanticDigest()).matches()) {
            throw new IllegalArgumentException("profile 의 inventory 결속이 없습니다");
        }
        requireDigest(envelope.payloadDigest(), envelope.payload());
        requireCollectionSafe(CanonicalJsonSupport.tree(envelope.payload()));
        return envelope;
    }

    public String writeAppUsage(AppUsageReport report) {
        Objects.requireNonNull(report, "report");
        requireCollectionSafe(CanonicalJsonSupport.tree(report));
        AppUsageEnvelope envelope = new AppUsageEnvelope(CURRENT_ENVELOPE_VERSION, APP_USAGE_TYPE,
                DIGEST_ALGORITHM, CanonicalSha256.digest(CanonicalJsonSupport.bytes(report)), report);
        return CanonicalJsonSupport.string(envelope);
    }

    public AppUsageEnvelope readAppUsage(String artifact) {
        AppUsageEnvelope envelope = CanonicalJsonSupport.read(Objects.requireNonNull(artifact, "artifact"),
                AppUsageEnvelope.class);
        requireEnvelope(envelope.envelopeVersion(), envelope.artifactType(), APP_USAGE_TYPE,
                envelope.digestAlgorithm(), envelope.payload());
        requireDigest(envelope.payloadDigest(), envelope.payload());
        requireCollectionSafe(CanonicalJsonSupport.tree(envelope.payload()));
        return envelope;
    }

    public String writeSuggestions(SuggestionReport report) {
        Objects.requireNonNull(report, "report");
        requireCollectionSafe(CanonicalJsonSupport.tree(report));
        SuggestionEnvelope envelope = new SuggestionEnvelope(CURRENT_ENVELOPE_VERSION, SUGGESTION_TYPE,
                DIGEST_ALGORITHM, CanonicalSha256.digest(CanonicalJsonSupport.bytes(report)), report);
        return CanonicalJsonSupport.string(envelope);
    }

    public SuggestionEnvelope readSuggestions(String artifact) {
        SuggestionEnvelope envelope = CanonicalJsonSupport.read(Objects.requireNonNull(artifact, "artifact"),
                SuggestionEnvelope.class);
        requireEnvelope(envelope.envelopeVersion(), envelope.artifactType(), SUGGESTION_TYPE,
                envelope.digestAlgorithm(), envelope.payload());
        requireDigest(envelope.payloadDigest(), envelope.payload());
        requireCollectionSafe(CanonicalJsonSupport.tree(envelope.payload()));
        return envelope;
    }

    private static void requireCollectionSafe(JsonNode tree) {
        ArtifactRedactionGuard.assertSafe(tree);
        ArtifactRedactionGuard.assertNoPersonalValues(tree);
    }

    private static void requireEnvelope(int version, String type, String expectedType, String algorithm,
                                        Object payload) {
        if (version != CURRENT_ENVELOPE_VERSION || !expectedType.equals(type)
                || !DIGEST_ALGORITHM.equals(algorithm) || payload == null) {
            throw new IllegalArgumentException("수집 산출물 envelope 형식이 맞지 않습니다: " + expectedType);
        }
    }

    private static void requireDigest(String digest, Object payload) {
        if (!CanonicalSha256.digest(CanonicalJsonSupport.bytes(payload)).equals(digest)) {
            throw new IllegalArgumentException("수집 산출물 본문 digest 가 맞지 않습니다");
        }
    }
}
