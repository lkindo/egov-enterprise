package nuri.business.service.user;

import nuri.foundation.core.user.LoginIdReferenceContributor;
import nuri.foundation.core.user.LoginIdReferenceContributor.Reference;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.dao.DataAccessResourceFailureException;
import org.springframework.jdbc.core.JdbcTemplate;

import java.util.Collection;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;

/**
 * 지워진 계정의 기록이 로그인 ID 를 들고 있는지 판정하는 경계를 고정한다. 실제 표·컬럼과의 대조는 PostgreSQL 통합 시험
 * ({@code LoginIdReuseIntegrationTest})이 맡는다.
 */
@DisplayName("LoginIdReuseGuard — 로그인 ID 재사용 판정")
class LoginIdReuseGuardTest {

    private final JdbcTemplate jdbcTemplate = mock(JdbcTemplate.class);

    private static LoginIdReferenceContributor contributor(Reference... references) {
        return new LoginIdReferenceContributor() {
            @Override
            public Collection<Reference> loginIdReferences() {
                return List.of(references);
            }
        };
    }

    @Test
    @DisplayName("등록한 컬럼마다 로그인 ID 를 바인드 변수로 넘겨 EXISTS 로 묻고, 하나라도 남았으면 참이다")
    void reportsTheFirstColumnThatStillCarriesTheLoginId() {
        var guard = new LoginIdReuseGuard(jdbcTemplate, List.of(
                contributor(new Reference("tb_rpt_info", "frst_rgtr_id")),
                contributor(new Reference("tb_file_master", "frst_rgtr_id"))), new nuri.foundation.core.persistence.PostgresqlSqlDialect());
        given(jdbcTemplate.queryForObject(anyString(), eq(Boolean.class), eq("reused"))).willReturn(false);
        given(jdbcTemplate.queryForObject(
                eq("SELECT EXISTS (SELECT 1 FROM tb_rpt_info WHERE frst_rgtr_id = ?)"), eq(Boolean.class), eq("reused")))
                .willReturn(true);

        assertThat(guard.isStillReferenced("reused")).isTrue();
        // 표 이름 순으로 묻는다 — 판정 순서가 실행마다 같다.
        assertThat(guard.references()).extracting(Reference::qualifiedName)
                .containsExactly("tb_file_master.frst_rgtr_id", "tb_rpt_info.frst_rgtr_id");
        verify(jdbcTemplate).queryForObject(
                "SELECT EXISTS (SELECT 1 FROM tb_file_master WHERE frst_rgtr_id = ?)", Boolean.class, "reused");
    }

    @Test
    @DisplayName("어느 컬럼에도 없으면 거짓이고, 빈 로그인 ID 는 조회하지 않는다")
    void falseWhenNoColumnCarriesTheLoginId() {
        var guard = new LoginIdReuseGuard(jdbcTemplate, List.of(contributor(
                new Reference("tb_schdl_info", "frst_rgtr_id"), new Reference("tb_schdl_info", "schdl_pic_id"))),
                new nuri.foundation.core.persistence.PostgresqlSqlDialect());
        given(jdbcTemplate.queryForObject(anyString(), eq(Boolean.class), eq("fresh"))).willReturn(false);

        assertThat(guard.isStillReferenced("fresh")).isFalse();
        verify(jdbcTemplate).queryForObject(
                "SELECT EXISTS (SELECT 1 FROM tb_schdl_info WHERE schdl_pic_id = ?)", Boolean.class, "fresh");

        var untouched = mock(JdbcTemplate.class);
        var emptyGuard = new LoginIdReuseGuard(untouched, List.of(contributor(new Reference("tb_rpt_info", "user_id"))), new nuri.foundation.core.persistence.PostgresqlSqlDialect());
        assertThat(emptyGuard.isStillReferenced("")).isFalse();
        assertThat(emptyGuard.isStillReferenced(null)).isFalse();
        verifyNoInteractions(untouched);
    }

    @Test
    @DisplayName("조회가 실패하면 '남은 기록 없음' 으로 보지 않고 예외를 올린다(fail-closed)")
    void propagatesLookupFailure() {
        var guard = new LoginIdReuseGuard(jdbcTemplate, List.of(contributor(new Reference("tb_rpt_info", "user_id"))), new nuri.foundation.core.persistence.PostgresqlSqlDialect());
        given(jdbcTemplate.queryForObject(anyString(), eq(Boolean.class), eq("reused")))
                .willThrow(new DataAccessResourceFailureException("relation does not exist"));

        assertThatThrownBy(() -> guard.isStillReferenced("reused"))
                .isInstanceOf(DataAccessResourceFailureException.class);
    }

    @Test
    @DisplayName("기여가 없거나, 빈 기여이거나, 같은 컬럼을 두 번 등록하면 기동하지 않는다")
    void rejectsEmptyOrDuplicateRegistrations() {
        assertThatThrownBy(() -> new LoginIdReuseGuard(jdbcTemplate, List.of(), new nuri.foundation.core.persistence.PostgresqlSqlDialect()))
                .isInstanceOf(IllegalStateException.class).hasMessageContaining("하나도 등록되지 않았다");
        assertThatThrownBy(() -> new LoginIdReuseGuard(jdbcTemplate, List.of(contributor()), new nuri.foundation.core.persistence.PostgresqlSqlDialect()))
                .isInstanceOf(IllegalStateException.class).hasMessageContaining("컬럼을 하나도 등록하지 않았다");
        assertThatThrownBy(() -> new LoginIdReuseGuard(jdbcTemplate, List.of(
                contributor(new Reference("tb_rpt_info", "frst_rgtr_id")),
                contributor(new Reference("tb_rpt_info", "frst_rgtr_id"))), new nuri.foundation.core.persistence.PostgresqlSqlDialect()))
                .isInstanceOf(IllegalStateException.class).hasMessageContaining("중복 등록");
        verify(jdbcTemplate, never()).queryForObject(anyString(), eq(Boolean.class), anyString());
    }

    @Test
    @DisplayName("표·컬럼 이름은 SQL 식별자 형식만 받는다 — 이름이 그대로 SQL 에 들어가기 때문이다")
    void referenceNamesMustBeSqlIdentifiers() {
        assertThatThrownBy(() -> new Reference("tb_rpt_info; DROP TABLE x", "frst_rgtr_id"))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> new Reference("tb_rpt_info", "frst_rgtr_id = frst_rgtr_id OR 1"))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> new Reference("TB_RPT_INFO", "frst_rgtr_id")).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> new Reference(null, "frst_rgtr_id")).isInstanceOf(IllegalArgumentException.class);
        assertThat(new Reference("tb_rpt_info", "user_id").qualifiedName()).isEqualTo("tb_rpt_info.user_id");
    }
}
