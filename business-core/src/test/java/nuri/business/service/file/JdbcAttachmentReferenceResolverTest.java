package nuri.business.service.file;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentMatchers;
import org.springframework.dao.DataAccessException;
import org.springframework.dao.QueryTimeoutException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.ArrayList;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

/**
 * 🔒 참조원 조회 SQL 조립 검증 — {@link JdbcAttachmentReferenceResolver}.
 *
 * <p>[왜 SQL 을 검증하나] 이 클래스는 첨부 인가의 <b>사실 수집기</b>다. 여기서 조립하는 술어와
 * 파라미터 바인딩이 어긋나면 판정 자체가 틀리는데, 그 오류는 <b>조용하다</b> — SQL 은 여전히
 * 실행되고 결과만 달라진다. 특히 파라미터 순서는 SELECT 절의 {@code ?} 가 WHERE 절보다 앞서기
 * 때문에 직관과 반대라, 실수하면 "남의 loginId 로 소유권을 판정" 하는 형태가 될 수 있다.
 *
 * <p>실 DB 없이 검증한다 — {@link JdbcTemplate} 을 목으로 두고 조립된 SQL 문자열과 바인딩
 * 파라미터를 그대로 포착한다. DB 를 띄워야만 도는 검증은 결국 돌지 않는다.
 */
@DisplayName("JdbcAttachmentReferenceResolver — 참조원 조회 SQL 조립")
class JdbcAttachmentReferenceResolverTest {

    private static final Long ATCH_FILE_SN = 101L;
    private static final String LOGIN_ID = "webmaster";
    private static final String ESNTL_ID = "USR_0000000000000001";

    /** 조립된 SQL 과 파라미터를 포착하면서, 지정한 카운트를 돌려주는 목 JdbcTemplate. */
    private static final class CapturingJdbc {
        final JdbcTemplate template = mock(JdbcTemplate.class);
        final List<String> sqls = new ArrayList<>();
        final List<Object[]> params = new ArrayList<>();

        CapturingJdbc(long refCnt, long sharedCnt, long ownerCnt) {
            when(template.queryForObject(anyString(), ArgumentMatchers.<RowMapper<Object>>any(), any(Object[].class)))
                    .thenAnswer(invocation -> {
                        sqls.add(invocation.getArgument(0));
                        RowMapper<?> mapper = invocation.getArgument(1);
                        // Mockito 는 varargs 를 위치 인자로 평탄화한다 — getArgument(2) 는 배열이 아니라
                        // 첫 번째 가변인자다. 개수가 참조원마다 다르므로 원본 배열에서 잘라 낸다.
                        Object[] all = invocation.getArguments();
                        params.add(java.util.Arrays.copyOfRange(all, 2, all.length));
                        ResultSet rs = mock(ResultSet.class);
                        when(rs.getLong("ref_cnt")).thenReturn(refCnt);
                        when(rs.getLong("shared_cnt")).thenReturn(sharedCnt);
                        when(rs.getLong("owner_cnt")).thenReturn(ownerCnt);
                        return mapper.mapRow(rs, 1);
                    });
        }

        JdbcAttachmentReferenceResolver resolver() {
            return new JdbcAttachmentReferenceResolver(template);
        }

        String sqlFor(AttachmentSource source) {
            return sqls.stream().filter(s -> s.contains(" FROM " + source.table() + " ")).findFirst()
                    .orElseThrow(() -> new AssertionError("해당 참조원 조회가 발생하지 않았다: " + source));
        }

        Object[] paramsFor(AttachmentSource source) {
            for (int i = 0; i < sqls.size(); i++) {
                if (sqls.get(i).contains(" FROM " + source.table() + " ")) {
                    return params.get(i);
                }
            }
            throw new AssertionError("해당 참조원 조회가 발생하지 않았다: " + source);
        }
    }

    @Test
    @DisplayName("파생 로그(DERIVED)는 조회조차 하지 않는다 — 접근권을 만들지 않으므로 비용도 들이지 않는다")
    void derivedSourceIsNeverQueried() {
        CapturingJdbc jdbc = new CapturingJdbc(0, 0, 0);

        jdbc.resolver().resolve(ATCH_FILE_SN, LOGIN_ID, ESNTL_ID);

        assertThat(jdbc.sqls)
                .as("DERIVED 참조원을 조회하면 '다운로드 이력이 곧 열람 권한' 이라는 잘못된 축이 생긴다")
                .noneMatch(sql -> sql.contains(AttachmentSource.DATA_USE_STATS.table()));
        // 나머지 12종은 전부 조회된다.
        assertThat(jdbc.sqls).hasSize(AttachmentSource.values().length - 1);
    }

    @Test
    @DisplayName("파라미터는 SELECT 절(소유 술어) → WHERE 절(atchFileSn) 순으로 바인딩된다")
    void ownerParametersAreBoundBeforeTheAttachmentId() {
        CapturingJdbc jdbc = new CapturingJdbc(0, 0, 0);

        jdbc.resolver().resolve(ATCH_FILE_SN, LOGIN_ID, ESNTL_ID);

        // BOARD: frst_rgtr_id = ?(loginId) OR user_id = ?(esntlId), 그리고 마지막이 atchFileSn.
        assertThat(jdbc.paramsFor(AttachmentSource.BOARD))
                .as("순서가 어긋나면 남의 식별자로 소유권을 판정하게 된다")
                .containsExactly(LOGIN_ID, ESNTL_ID, ATCH_FILE_SN);

        // NOTE: loginId 1개 + esntlId 2개(발신·수신 EXISTS) + atchFileSn.
        assertThat(jdbc.paramsFor(AttachmentSource.NOTE))
                .containsExactly(LOGIN_ID, ESNTL_ID, ESNTL_ID, ATCH_FILE_SN);

        // 두 축이 모두 있으면 OR 로 이어야 한다. 구분자가 빠지면 SQL 이 깨지고,
        // AND 로 바뀌면 '작성자이면서 동시에 esntlId 소유자' 라는 성립 불가 조건이 된다.
        assertThat(jdbc.sqlFor(AttachmentSource.BOARD))
                .contains("(frst_rgtr_id = ?) OR (user_id = ?)");
    }

    @Test
    @DisplayName("공유 술어가 없는 개인 귀속 참조원은 SELECT 절에서 항상 거짓으로 조립된다")
    void personalSourcesCompileSharedPredicateToFalse() {
        CapturingJdbc jdbc = new CapturingJdbc(0, 0, 0);

        jdbc.resolver().resolve(ATCH_FILE_SN, LOGIN_ID, ESNTL_ID);

        assertThat(jdbc.sqlFor(AttachmentSource.NOTE))
                .as("개인 귀속인데 공유 술어가 참이 되면 첨부가 전체 공개된다")
                .contains("WHEN 1 = 0 THEN 1");
        assertThat(jdbc.sqlFor(AttachmentSource.BOARD))
                .contains("scrt_yn");
    }

    @Test
    @DisplayName("인증 축이 없으면 소유 술어를 조립하지 않는다 — 바인딩 개수 불일치로 SQL 이 깨지지 않도록")
    void missingIdentityAxesProduceNoOwnerPredicate() {
        CapturingJdbc jdbc = new CapturingJdbc(0, 0, 0);

        jdbc.resolver().resolve(ATCH_FILE_SN, null, null);

        assertThat(jdbc.paramsFor(AttachmentSource.BOARD)).containsExactly(ATCH_FILE_SN);
        assertThat(jdbc.sqlFor(AttachmentSource.NOTE)).doesNotContain("tb_note_sndng");
        // 소유 술어가 비면 항상-거짓으로 채워야 한다. 비운 채로 두면 SQL 문법이 깨지고,
        // 참으로 채우면 미인증자에게 소유 근거가 서 버린다.
        assertThat(jdbc.sqlFor(AttachmentSource.BOARD))
                .contains("WHEN 1 = 0 THEN 1 ELSE 0 END) AS owner_cnt");
    }

    @Test
    @DisplayName("소유 근거가 하나라도 있으면 ownerGrant 로 집계된다")
    void ownerHitIsAggregated() {
        AttachmentReferenceResolver.Grants grants =
                new CapturingJdbc(1, 0, 1).resolver().resolve(ATCH_FILE_SN, LOGIN_ID, ESNTL_ID);

        assertThat(grants.ownerGrant()).isTrue();
        assertThat(grants.sharedGrant()).isFalse();
    }

    @Test
    @DisplayName("공유 근거가 하나라도 있으면 sharedGrant 로 집계된다")
    void sharedHitIsAggregated() {
        AttachmentReferenceResolver.Grants grants =
                new CapturingJdbc(1, 1, 0).resolver().resolve(ATCH_FILE_SN, LOGIN_ID, ESNTL_ID);

        assertThat(grants.sharedGrant()).isTrue();
        assertThat(grants.ownerGrant()).isFalse();
    }

    @Test
    @DisplayName("개인 귀속 참조원에 행이 있으면 personalReference 가 선다 — 관리자 우회 차단 근거")
    void personalReferenceIsFlaggedWhenRowsExist() {
        AttachmentReferenceResolver.Grants grants =
                new CapturingJdbc(1, 0, 0).resolver().resolve(ATCH_FILE_SN, LOGIN_ID, ESNTL_ID);

        assertThat(grants.personalReference()).isTrue();
    }

    @Test
    @DisplayName("참조 행이 하나도 없으면 어떤 근거도 서지 않는다 — 고아 첨부")
    void noRowsMeansNoGrants() {
        AttachmentReferenceResolver.Grants grants =
                new CapturingJdbc(0, 0, 0).resolver().resolve(ATCH_FILE_SN, LOGIN_ID, ESNTL_ID);

        assertThat(grants.sharedGrant()).isFalse();
        assertThat(grants.ownerGrant()).isFalse();
        assertThat(grants.personalReference())
                .as("참조가 없으면 관리자 우회를 막을 이유도 없다")
                .isFalse();
    }

    @Test
    @DisplayName("🚨 조회 실패는 fail-closed 다 — 근거를 만들지 않고 관리자 우회까지 막는다")
    void queryFailureIsFailClosed() {
        JdbcTemplate template = mock(JdbcTemplate.class);
        when(template.queryForObject(anyString(), ArgumentMatchers.<RowMapper<Object>>any(), any(Object[].class)))
                .thenThrow(new QueryTimeoutException("db down"));

        AttachmentReferenceResolver.Grants grants =
                new JdbcAttachmentReferenceResolver(template).resolve(ATCH_FILE_SN, LOGIN_ID, ESNTL_ID);

        assertThat(grants.sharedGrant()).isFalse();
        assertThat(grants.ownerGrant()).isFalse();
        assertThat(grants.personalReference())
                .as("인가 판정에서 '모르는 것' 은 허용이 아니다 — 실패는 관리자 우회까지 막는 쪽으로 기운다")
                .isTrue();
    }

    @Test
    @DisplayName("조회 실패는 예외로 전파되지 않는다 — 한 참조원의 장애가 전체 조회를 죽이지 않는다")
    void queryFailureDoesNotPropagate() {
        JdbcTemplate template = mock(JdbcTemplate.class);
        when(template.queryForObject(anyString(), ArgumentMatchers.<RowMapper<Object>>any(), any(Object[].class)))
                .thenThrow(new QueryTimeoutException("db down"));

        AttachmentReferenceResolver.Grants grants =
                new JdbcAttachmentReferenceResolver(template).resolve(ATCH_FILE_SN, LOGIN_ID, ESNTL_ID);

        assertThat(grants).isNotNull();
    }

    @Test
    @DisplayName("조회 SQL 은 참조원 테이블을 atch_file_sn 로 좁힌다 — 전수 스캔·오조회 방지")
    void queryNarrowsByAttachmentId() {
        CapturingJdbc jdbc = new CapturingJdbc(0, 0, 0);

        jdbc.resolver().resolve(ATCH_FILE_SN, LOGIN_ID, ESNTL_ID);

        for (String sql : jdbc.sqls) {
            assertThat(sql).contains("COUNT(*) AS ref_cnt");
        }
        assertThat(jdbc.sqlFor(AttachmentSource.BOARD)).contains("WHERE atch_file_sn = ?");
        // 팝업만 연결 방식이 다르다 — URL 문자열 정확 일치.
        assertThat(jdbc.sqlFor(AttachmentSource.POPUP))
                .contains("WHERE (file_url = '/api/v1/files/' || ?");
    }

    @Test
    @DisplayName("🚨 팝업 URL 안의 '?' 는 자리표시자가 아니다 — 리터럴을 세면 바인딩 개수가 어긋나 SQL 이 깨진다")
    void popupBindsAttachmentIdForEachLinkagePlaceholder() {
        CapturingJdbc jdbc = new CapturingJdbc(0, 0, 0);

        jdbc.resolver().resolve(ATCH_FILE_SN, LOGIN_ID, ESNTL_ID);

        // 연결 술어는 `'/api/v1/files/download?fileId=' || ?` 를 포함한다. 그 URL 안의 '?' 까지 세면
        // 파라미터가 하나 더 붙어 JDBC 가 자리표시자 불일치로 실패한다(2026-08-04 실측).
        // 소유(loginId) 1개 + 연결(atchFileSn) 2개 = 3개여야 한다.
        assertThat(jdbc.paramsFor(AttachmentSource.POPUP))
                .containsExactly(LOGIN_ID, ATCH_FILE_SN, ATCH_FILE_SN);
    }

    @Test
    @DisplayName("DataAccessException 계열 전반을 fail-closed 로 흡수한다")
    void anyDataAccessExceptionIsAbsorbed() {
        JdbcTemplate template = mock(JdbcTemplate.class);
        when(template.queryForObject(anyString(), ArgumentMatchers.<RowMapper<Object>>any(), any(Object[].class)))
                .thenThrow(new BadTable("relation does not exist"));

        AttachmentReferenceResolver.Grants grants =
                new JdbcAttachmentReferenceResolver(template).resolve(ATCH_FILE_SN, LOGIN_ID, ESNTL_ID);

        assertThat(grants.personalReference()).isTrue();
    }

    /** 테이블 부재처럼 스키마 계열 실패를 흉내내는 최소 예외. */
    private static final class BadTable extends DataAccessException {
        BadTable(String msg) {
            super(msg);
        }
    }
}
