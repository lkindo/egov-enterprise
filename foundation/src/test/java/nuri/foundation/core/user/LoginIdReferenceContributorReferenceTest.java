package nuri.foundation.core.user;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.NullSource;
import org.junit.jupiter.params.provider.ValueSource;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@DisplayName("LoginIdReferenceContributor.Reference SQL 식별자 경계")
class LoginIdReferenceContributorReferenceTest {

    @Test
    @DisplayName("소문자 snake_case 테이블·컬럼을 받고 이름만 내보낸다")
    void acceptsSnakeCaseIdentifiers() {
        var reference = new LoginIdReferenceContributor.Reference("tb_rpt_info", "frst_rgtr_id");

        assertThat(reference.qualifiedName()).isEqualTo("tb_rpt_info.frst_rgtr_id");
    }

    @ParameterizedTest
    @NullSource
    @ValueSource(strings = {"", "TB_RPT", "tb_rpt; drop table x", "tb\"rpt", "1tb", "tb rpt"})
    @DisplayName("SQL 식별자가 아닌 테이블 이름은 거부한다")
    void rejectsNonIdentifierTable(String table) {
        assertThatThrownBy(() -> new LoginIdReferenceContributor.Reference(table, "frst_rgtr_id"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("테이블 이름");
    }

    @ParameterizedTest
    @NullSource
    @ValueSource(strings = {"", "FRST_RGTR_ID", "frst_rgtr_id--", "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"})
    @DisplayName("SQL 식별자가 아닌 컬럼 이름은 거부한다")
    void rejectsNonIdentifierColumn(String column) {
        assertThatThrownBy(() -> new LoginIdReferenceContributor.Reference("tb_rpt_info", column))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("컬럼 이름");
    }
}
