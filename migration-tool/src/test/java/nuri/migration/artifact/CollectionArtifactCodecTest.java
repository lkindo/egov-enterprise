package nuri.migration.artifact;

import nuri.migration.appscan.AppUsageReport;
import nuri.migration.appscan.AppUsageReport.ColumnUsage;
import nuri.migration.appscan.AppUsageReport.FileCounts;
import nuri.migration.appscan.AppUsageReport.UsageEvidence;
import nuri.migration.profile.SourceProfile;
import nuri.migration.profile.SourceProfile.ColumnProfile;
import nuri.migration.profile.SourceProfile.CommentEvidence;
import nuri.migration.profile.SourceProfile.TableProfile;
import nuri.migration.profile.SourceProfile.ValueFrequency;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class CollectionArtifactCodecTest {

    private static final String INVENTORY = "a".repeat(64);

    private final CollectionArtifactCodec codec = new CollectionArtifactCodec();

    @Test
    void profileRoundTripsWithItsInventoryBindingAndRejectsTampering() {
        String artifact = codec.writeProfile(profile("상태코드", "A"), INVENTORY);

        CollectionArtifactCodec.ProfileEnvelope envelope = codec.readProfile(artifact);

        assertThat(envelope.inventorySemanticDigest()).isEqualTo(INVENTORY);
        assertThat(envelope.payload()).isEqualTo(profile("상태코드", "A"));
        assertThat(codec.writeProfile(profile("상태코드", "A"), INVENTORY)).isEqualTo(artifact);
        assertThatThrownBy(() -> codec.readProfile(artifact.replace("\"A\"", "\"B\"")))
                .isInstanceOf(IllegalArgumentException.class).hasMessageContaining("digest");
    }

    @Test
    void profileWithoutABoundInventoryIsNotWritten() {
        assertThatThrownBy(() -> codec.writeProfile(profile("상태코드", "A"), "not-a-digest"))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> codec.writeProfile(profile("상태코드", "A"), null))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void personalValuesOrCredentialsAnywhereInTheBodyStopTheWrite() {
        assertThatThrownBy(() -> codec.writeProfile(profile("상태코드", "900101-1234567"), INVENTORY))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> codec.writeProfile(profile("담당 hong@example.com", "A"), INVENTORY))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> codec.writeProfile(profile("password=legacy", "A"), INVENTORY))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> codec.writeAppUsage(usage("010-1234-5678")))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void appUsageRoundTrips() {
        String artifact = codec.writeAppUsage(usage("Y"));

        assertThat(codec.readAppUsage(artifact).payload()).isEqualTo(usage("Y"));
        assertThatThrownBy(() -> codec.readProfile(artifact)).isInstanceOf(RuntimeException.class);
    }

    @Test
    void personalPatternsIgnoreDigitsInsideHexAndRedactInPlace() {
        assertThat(PersonalDataPatterns.find("sha256:0101234567890123456789abcdef0123456789")).isEmpty();
        assertThat(PersonalDataPatterns.find("REG_DT_20240101")).isEmpty();
        assertThat(PersonalDataPatterns.find("연락처 02-123-4567")).containsExactly(PersonalDataPatterns.Kind.PHONE);
        assertThat(PersonalDataPatterns.redact("주민 900101-2345678, a@b.co"))
                .isEqualTo("주민 [REDACTED:RRN], [REDACTED:EMAIL]");
    }

    private static SourceProfile profile(String comment, String code) {
        CommentEvidence evidence = new CommentEvidence(comment, false, null, "MATCH");
        ColumnProfile column = new ColumnProfile("STAT_CD", 1, "CHAR", 1, 1L, 0, true, 10, 0, 0, 10, 0, 0, 0, 0,
                1, 1, 10, 0, 1, false, Map.of("YN", 0L), 0, null, null, false,
                List.of(new ValueFrequency(code, 10)), 0, 0, null, evidence);
        return new SourceProfile(SourceProfile.CURRENT_VERSION, null, true, List.of(new TableProfile(
                null, "PUBLIC", "LEGACY_USER", "PROFILED", null, 10, false,
                new CommentEvidence(null, false, null, "ABSENT"), List.of(column))));
    }

    private static AppUsageReport usage(String value) {
        return new AppUsageReport(AppUsageReport.CURRENT_VERSION, "COMPLETE",
                new FileCounts(1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0), List.of(),
                List.of(new ColumnUsage("USE_YN", List.of(new UsageEvidence(
                        "SQL_LITERAL", "sql/UserMapper.xml", 3, "TB_USER", null, null, value, null)))),
                List.of(), List.of(), List.of(), List.of(), 0);
    }
}
