package nuri.migration.verify;

import nuri.migration.etl.EtlExecutor.TableResult;
import nuri.migration.verify.MigrationReport.Status;
import nuri.migration.verify.MigrationReport.TableReport;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.mock;

/**
 * 이관 결과 <b>등급 판정</b> 테스트.
 *
 * <p>[2026-08-09 신설] 이 클래스에는 <b>테스트가 하나도 없었다</b>(스코프 실측 55%, 생존 29건).
 *
 * <p>여기는 "이관이 성공했는가" 를 판정하는 자리다. 조건 하나가 뒤집히면
 * <b>행이 유실된 이관을 PASS 로 판정</b>한다 — 그리고 PASS 는 아무도 다시 보지 않는다.
 * 클래스 javadoc 자신이 그 역사를 적어 두었다: 종전 stub 은 {@code ok = errors == 0} 이라
 * <b>쓰기 유실·유령 기록을 성공으로 숨겼다(false-green)</b>. 그 stub 을 실증 검증으로 바꿨는데,
 * 정작 그 판정 로직에는 검증이 없었다.
 *
 * <p>등급 규칙(위에서부터 우선):
 * <ol>
 *   <li>FAIL — 오류 존재</li>
 *   <li>FAIL — (commit) 타깃 실측행 &lt; 기록 : 유령 기록</li>
 *   <li>FAIL — (commit) 기록 ≠ 변환 : 쓰기 유실</li>
 *   <li>WARN — 변환 ≠ 조회 : 행 드롭</li>
 *   <li>PASS — dry-run(타깃 미대조) / 전부 일치</li>
 * </ol>
 * <b>우선순위 자체가 검증 대상이다</b> — 순서가 뒤바뀌면 더 심각한 문제가 덜 심각한 등급에 가려진다.
 */
@DisplayName("이관 결과 등급 판정 테스트")
class MigrationVerifierTest {

    private final MigrationVerifier verifier = new MigrationVerifier();

    private static TableResult result(int read, int transformed, int written, String... errors) {
        return new TableResult("src_tbl", "tgt_tbl", read, transformed, written, List.of(errors));
    }

    /** 타깃 재조회가 주어진 행수를 돌려주는 JdbcTemplate 스텁. */
    private static JdbcTemplate targetWithRows(long rows) {
        JdbcTemplate jt = mock(JdbcTemplate.class);
        given(jt.queryForObject(anyString(), eq(Long.class))).willReturn(rows);
        return jt;
    }

    @Nested
    @DisplayName("commit 모드")
    class CommitMode {

        @Test
        @DisplayName("조회==변환==기록 이고 타깃 실측행이 일치하면 PASS")
        void allMatchedIsPass() {
            MigrationReport report = verifier.verify(List.of(result(10, 10, 10)), targetWithRows(10));

            assertThat(report.overall()).isEqualTo(Status.PASS);
            assertThat(report.ok()).isTrue();
            TableReport t = report.tables().get(0);
            assertThat(t.status()).isEqualTo(Status.PASS);
            assertThat(t.targetRows()).isEqualTo(10);
            assertThat(t.note()).isEmpty();
        }

        @Test
        @DisplayName("오류가 있으면 다른 수치가 완벽해도 FAIL")
        void anyErrorIsFail() {
            MigrationReport report = verifier.verify(
                    List.of(result(10, 10, 10, "PK 위반")), targetWithRows(10));

            // 이 분기를 뒤집으면 오류가 난 이관이 PASS 가 된다.
            assertThat(report.overall()).isEqualTo(Status.FAIL);
            assertThat(report.ok()).isFalse();
            assertThat(report.tables().get(0).note()).contains("오류 1건");
        }

        @Test
        @DisplayName("타깃 실측행이 기록보다 적으면 FAIL — 유령 기록")
        void ghostWriteIsFail() {
            // 기록은 10건이라는데 타깃에 7건뿐이다 — 3건은 어디에도 없다.
            MigrationReport report = verifier.verify(List.of(result(10, 10, 10)), targetWithRows(7));

            assertThat(report.overall()).isEqualTo(Status.FAIL);
            assertThat(report.tables().get(0).note()).contains("유령 기록");
        }

        @Test
        @DisplayName("타깃 실측행이 기록과 같으면 유령 기록이 아니다 (경계)")
        void equalTargetRowsIsNotGhost() {
            // `targetRows < written` 의 경계를 `<=` 로 옮긴 뮤턴트가 여기서 죽는다.
            assertThat(verifier.verify(List.of(result(10, 10, 10)), targetWithRows(10)).overall())
                    .isEqualTo(Status.PASS);
        }

        @Test
        @DisplayName("타깃에 더 많이 있어도 유령 기록은 아니다 (기존 데이터가 있을 수 있다)")
        void moreTargetRowsIsNotGhost() {
            assertThat(verifier.verify(List.of(result(10, 10, 10)), targetWithRows(999)).overall())
                    .isEqualTo(Status.PASS);
        }

        @Test
        @DisplayName("기록이 변환과 다르면 FAIL — 쓰기 유실")
        void writeLossIsFail() {
            // 변환은 10건 했는데 8건만 기록됐다.
            MigrationReport report = verifier.verify(List.of(result(10, 10, 8)), targetWithRows(8));

            assertThat(report.overall()).isEqualTo(Status.FAIL);
            assertThat(report.tables().get(0).note()).contains("쓰기 유실");
        }

        @Test
        @DisplayName("변환이 조회보다 적으면 WARN — 행 드롭")
        void rowDropIsWarn() {
            // 조회 10, 변환 8, 기록 8 — 쓰기는 온전하나 변환 단계에서 2건이 빠졌다.
            MigrationReport report = verifier.verify(List.of(result(10, 8, 8)), targetWithRows(8));

            assertThat(report.overall()).isEqualTo(Status.WARN);
            assertThat(report.ok()).as("WARN 은 실패가 아니다").isTrue();
            assertThat(report.tables().get(0).note()).contains("행 드롭");
        }

        @Test
        @DisplayName("유령 기록이 쓰기 유실보다 먼저 판정된다 — 우선순위 고정")
        void ghostWriteTakesPrecedenceOverWriteLoss() {
            // 둘 다 성립하는 상황: 변환 10 · 기록 8(쓰기 유실) · 타깃 5(유령 기록)
            MigrationReport report = verifier.verify(List.of(result(10, 10, 8)), targetWithRows(5));

            assertThat(report.overall()).isEqualTo(Status.FAIL);
            // 순서가 바뀌면 더 심각한 신호(타깃에 실제로 없다)가 가려진다.
            assertThat(report.tables().get(0).note()).contains("유령 기록");
        }

        @Test
        @DisplayName("타깃 조회가 실패하면(-1) 유령 기록 검사만 건너뛴다")
        void unreadableTargetSkipsGhostCheckOnly() {
            JdbcTemplate jt = mock(JdbcTemplate.class);
            given(jt.queryForObject(anyString(), eq(Long.class)))
                    .willThrow(new org.springframework.dao.DataAccessResourceFailureException("테이블 없음"));

            // 대조 불가(-1)여도 쓰기 유실 검사는 살아 있어야 한다.
            MigrationReport lost = verifier.verify(List.of(result(10, 10, 8)), jt);
            assertThat(lost.overall()).isEqualTo(Status.FAIL);
            assertThat(lost.tables().get(0).note()).contains("쓰기 유실");
            assertThat(lost.tables().get(0).targetRows()).isEqualTo(-1L);

            // 그 외에는 정상 등급.
            assertThat(verifier.verify(List.of(result(10, 10, 10)), jt).overall()).isEqualTo(Status.PASS);
        }

        @Test
        @DisplayName("count 가 null 이면 0 으로 본다")
        void nullCountBecomesZero() {
            JdbcTemplate jt = mock(JdbcTemplate.class);
            given(jt.queryForObject(anyString(), eq(Long.class))).willReturn(null);

            // 0 < 기록 이므로 유령 기록이다 — null 을 -1(대조 불가)로 오독하면 이 신호가 사라진다.
            MigrationReport report = verifier.verify(List.of(result(10, 10, 10)), jt);
            assertThat(report.overall()).isEqualTo(Status.FAIL);
            assertThat(report.tables().get(0).targetRows()).isZero();
        }
    }

    @Nested
    @DisplayName("dry-run 모드 (타깃 없음)")
    class DryRun {

        @Test
        @DisplayName("타깃을 대조하지 않고 PASS 로 두되 그 사실을 남긴다")
        void dryRunIsPassWithNote() {
            MigrationReport report = verifier.verify(List.of(result(10, 10, 10)), null);

            assertThat(report.overall()).isEqualTo(Status.PASS);
            TableReport t = report.tables().get(0);
            assertThat(t.targetRows()).as("대조하지 않았음을 -1 로 표시한다").isEqualTo(-1L);
            assertThat(t.note()).contains("dry-run");
        }

        @Test
        @DisplayName("dry-run 이어도 기록≠변환은 쓰기 유실로 보지 않는다 (실제 쓰기가 없다)")
        void dryRunDoesNotFlagWriteLoss() {
            // commit 이 아니면 written 은 의미가 없다 — 여기서 FAIL 을 내면 dry-run 이 항상 실패한다.
            MigrationReport report = verifier.verify(List.of(result(10, 10, 0)), null);

            assertThat(report.overall()).isEqualTo(Status.PASS);
            assertThat(report.tables().get(0).note()).contains("dry-run");
        }

        @Test
        @DisplayName("dry-run 에서도 행 드롭과 오류는 잡는다")
        void dryRunStillDetectsDropAndErrors() {
            assertThat(verifier.verify(List.of(result(10, 8, 0)), null).overall()).isEqualTo(Status.WARN);
            assertThat(verifier.verify(List.of(result(10, 10, 0, "변환 실패")), null).overall())
                    .isEqualTo(Status.FAIL);
        }
    }

    @Nested
    @DisplayName("전체 등급 집계")
    class OverallAggregation {

        @Test
        @DisplayName("가장 나쁜 등급이 전체 등급이 된다")
        void worstWins() {
            // ⚠ 같은 JdbcTemplate 스텁이 모든 테이블에 같은 행수를 돌려준다.
            //   그래서 written 을 8 로 맞춰야 첫 테이블이 유령 기록으로 오판되지 않는다.
            JdbcTemplate jt = targetWithRows(8);

            // PASS + WARN -> WARN
            assertThat(verifier.verify(List.of(result(8, 8, 8), result(10, 8, 8)), jt)
                    .overall()).isEqualTo(Status.WARN);

            // PASS + FAIL -> FAIL
            assertThat(verifier.verify(List.of(result(8, 8, 8), result(8, 8, 8, "err")), jt)
                    .overall()).isEqualTo(Status.FAIL);
        }

        @Test
        @DisplayName("FAIL 은 WARN 을 이긴다 — 순서와 무관하게")
        void failBeatsWarnInEitherOrder() {
            JdbcTemplate jt = targetWithRows(8);
            TableResult warn = result(10, 8, 8);
            TableResult fail = result(8, 8, 8, "err");

            // 뒤에 오든 앞에 오든 결과가 같아야 한다 — worst() 가 대칭이어야 성립한다.
            assertThat(verifier.verify(List.of(warn, fail), jt).overall()).isEqualTo(Status.FAIL);
            assertThat(verifier.verify(List.of(fail, warn), jt).overall()).isEqualTo(Status.FAIL);
        }

        @Test
        @DisplayName("테이블이 없으면 PASS 다")
        void emptyResultIsPass() {
            MigrationReport report = verifier.verify(List.of(), null);

            assertThat(report.overall()).isEqualTo(Status.PASS);
            assertThat(report.tables()).isEmpty();
        }
    }

    @Nested
    @DisplayName("리포트 출력")
    class Reporting {

        @Test
        @DisplayName("ok() 는 FAIL 일 때만 false 다")
        void okIsFalseOnlyForFail() {
            assertThat(new MigrationReport(List.of(), Status.PASS).ok()).isTrue();
            assertThat(new MigrationReport(List.of(), Status.WARN).ok()).as("WARN 은 통과다").isTrue();
            assertThat(new MigrationReport(List.of(), Status.FAIL).ok()).isFalse();
        }

        @Test
        @DisplayName("요약에 테이블별 수치와 최종 등급이 모두 담긴다")
        void summaryContainsCountsAndResult() {
            MigrationReport report = verifier.verify(List.of(result(10, 8, 8)), targetWithRows(8));

            String summary = report.toSummary();

            assertThat(summary).contains("src_tbl", "tgt_tbl");
            assertThat(summary).contains("read=10", "transformed=8", "written=8", "errors=0");
            assertThat(summary).contains("targetRows=8");
            assertThat(summary).contains("행 드롭");
            assertThat(summary).contains("RESULT: WARN");
        }

        @Test
        @DisplayName("대조하지 않은 타깃 행수는 -1 이 아니라 '-' 로 적는다")
        void unmeasuredTargetRowsPrintedAsDash() {
            String summary = verifier.verify(List.of(result(10, 10, 10)), null).toSummary();

            // -1 을 그대로 찍으면 "행이 -1개" 로 읽혀 오해를 부른다.
            assertThat(summary).contains("targetRows=-");
            assertThat(summary).doesNotContain("targetRows=-1");
        }

        @Test
        @DisplayName("비고가 비어 있으면 괄호를 붙이지 않는다")
        void blankNoteIsOmitted() {
            String summary = verifier.verify(List.of(result(10, 10, 10)), targetWithRows(10)).toSummary();

            assertThat(summary).doesNotContain("()");
            assertThat(summary).contains("RESULT: PASS");
        }
    }
}
