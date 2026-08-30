package nuri.migration.artifact;

import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class SourceDriverEvidenceTest {

    @Test
    void bindsDriverClassJarBytesAndClasspathOrderWithoutPersistingThoseValues() {
        String first = "a".repeat(64);
        String second = "b".repeat(64);

        SourceDriverEvidence evidence = SourceDriverEvidence.isolated(
                "vendor.jdbc.Driver", List.of(first, second));

        assertThat(evidence.aggregateDigest()).matches("[0-9a-f]{64}");
        assertThat(evidence.jarCount()).isEqualTo(2);
        assertThat(evidence.toString())
                .doesNotContain("vendor.jdbc.Driver", first, second);
        assertThat(SourceDriverEvidence.isolated(
                "vendor.jdbc.Driver", List.of(second, first))).isNotEqualTo(evidence);
        assertThat(SourceDriverEvidence.isolated(
                "other.jdbc.Driver", List.of(first, second))).isNotEqualTo(evidence);
    }

    @Test
    void bundledAndUnboundEvidenceHaveDistinctSemantics() {
        SourceDriverEvidence bundled = SourceDriverEvidence.bundled("org.postgresql.Driver");
        SourceDriverEvidence byteBound = SourceDriverEvidence.bundled(
                "org.postgresql.Driver", "d".repeat(64));

        assertThat(bundled.bound()).isTrue();
        assertThat(bundled.jarCount()).isZero();
        assertThat(byteBound).isNotEqualTo(bundled);
        assertThat(SourceDriverEvidence.unbound().bound()).isFalse();
        assertThat(SourceDriverEvidence.unbound()).isNotEqualTo(bundled);
    }

    @Test
    void rejectsInconsistentOrMalformedEvidenceContracts() {
        assertThatThrownBy(() -> new SourceDriverEvidence(
                null, "SHA-256", "a".repeat(64), 0)).isInstanceOf(NullPointerException.class);
        assertThatThrownBy(() -> new SourceDriverEvidence(
                SourceDriverEvidence.LoadingMode.BUNDLED, "MD5", "a".repeat(64), 0))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> new SourceDriverEvidence(
                SourceDriverEvidence.LoadingMode.BUNDLED, "SHA-256", "A".repeat(64), 0))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> new SourceDriverEvidence(
                SourceDriverEvidence.LoadingMode.ISOLATED, "SHA-256", "a".repeat(64), 0))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> SourceDriverEvidence.isolated("", List.of("a".repeat(64))))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> SourceDriverEvidence.isolated(
                "vendor.Driver", List.of("invalid")))
                .isInstanceOf(IllegalArgumentException.class);

        assertThatThrownBy(() -> new SourceDriverEvidence(
                SourceDriverEvidence.LoadingMode.BUNDLED, "SHA-256", "a".repeat(64), -1))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> new SourceDriverEvidence(
                SourceDriverEvidence.LoadingMode.BUNDLED, "SHA-256", "a".repeat(64), 1))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> new SourceDriverEvidence(
                SourceDriverEvidence.LoadingMode.UNBOUND, "SHA-256", "a".repeat(64), 1))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> SourceDriverEvidence.bundled(null, "a".repeat(64)))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> SourceDriverEvidence.bundled(" ", "a".repeat(64)))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> SourceDriverEvidence.bundled("driver", null))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> SourceDriverEvidence.bundled("driver", "A".repeat(64)))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> SourceDriverEvidence.isolated(null, List.of("a".repeat(64))))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> SourceDriverEvidence.isolated("driver", null))
                .isInstanceOf(NullPointerException.class);
        assertThatThrownBy(() -> SourceDriverEvidence.isolated("driver", List.of()))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> SourceDriverEvidence.isolated("driver", List.of("A".repeat(64))))
                .isInstanceOf(IllegalArgumentException.class);
    }
}
