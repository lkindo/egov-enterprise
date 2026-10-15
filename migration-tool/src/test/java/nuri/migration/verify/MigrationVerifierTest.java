package nuri.migration.verify;

import nuri.migration.archive.ArchiveOutcome;
import nuri.migration.etl.EtlExecutor.TableResult;
import nuri.migration.isolate.IsolationTally;
import nuri.migration.model.MappingSpec;
import nuri.migration.verify.MigrationReport.Status;
import nuri.migration.verify.MigrationReport.TableReport;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;

import java.util.List;
import java.util.Map;

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
        @DisplayName("빈 테이블의 조회·변환·기록·실측이 모두 0이면 정상 완료다")
        void emptyCommittedTableIsPass() {
            MigrationReport report = verifier.verify(List.of(result(0, 0, 0)), targetWithRows(0));

            assertThat(report.overall()).isEqualTo(Status.PASS);
            assertThat(report.tables()).singleElement().satisfies(table -> {
                assertThat(table.targetRows()).isZero();
                assertThat(table.status()).isEqualTo(Status.PASS);
                assertThat(table.note()).isEmpty();
            });
        }

        @Test
        @DisplayName("오류가 있으면 다른 수치가 완벽해도 FAIL")
        void anyErrorIsFail() {
            MigrationReport report = verifier.verify(
                    List.of(result(10, 10, 10, "PK 위반")), targetWithRows(10));

            // 이 분기를 뒤집으면 오류가 난 이관이 PASS 가 된다.
            assertThat(report.overall()).isEqualTo(Status.FAIL);
            assertThat(report.ok()).isFalse();
            // [2026-10-13 DEC-OPS-309] 첫 오류를 함께 보여야 운영자가 어느 행·컬럼인지 안다.
            assertThat(report.tables().get(0).note()).isEqualTo("오류 1건 — 첫 오류: PK 위반");
            assertThat(verifier.verify(List.of(result(10, 10, 10, "첫째", "둘째")), targetWithRows(10))
                    .tables().get(0).note()).isEqualTo("오류 2건 — 첫 오류: 첫째");
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
            assertThat(report.ok()).as("strict 실행에서 WARN도 성공 신호가 아니다").isFalse();
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
        @DisplayName("타깃 조회가 실패하면 성공을 증명할 수 없으므로 FAIL")
        void unreadableTargetFailsClosed() {
            JdbcTemplate jt = mock(JdbcTemplate.class);
            given(jt.queryForObject(anyString(), eq(Long.class)))
                    .willThrow(new org.springframework.dao.DataAccessResourceFailureException("테이블 없음"));

            // 대조 불가(-1)는 다른 수치가 맞더라도 운영 성공으로 볼 수 없다.
            MigrationReport lost = verifier.verify(List.of(result(10, 10, 8)), jt);
            assertThat(lost.overall()).isEqualTo(Status.FAIL);
            assertThat(lost.tables().get(0).note()).contains("대조 실패");
            assertThat(lost.tables().get(0).targetRows()).isEqualTo(-1L);

            assertThat(verifier.verify(List.of(result(10, 10, 10)), jt).overall()).isEqualTo(Status.FAIL);
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
        @DisplayName("실행 결과가 비어 있으면 성공을 증명할 수 없어 FAIL")
        void emptyResultFailsClosed() {
            MigrationReport report = verifier.verify(List.of(), null);

            assertThat(report.overall()).isEqualTo(Status.FAIL);
            assertThat(report.tables()).singleElement().satisfies(table ->
                    assertThat(table.note()).contains("비어", "증명"));
        }

        @Test
        @DisplayName("선언 대비 실행 결과의 개수나 source→target identity가 다르면 FAIL")
        void resultCardinalityAndIdentityMustMatchTheMapping() {
            MappingSpec.TableMapping expected = new MappingSpec.TableMapping(
                    "src_tbl", "tgt_tbl", null, List.of(), null);
            MappingSpec spec = new MappingSpec(null, null, List.of(expected), Map.of());

            MigrationReport missing = verifier.verify(spec, List.of(), null);
            MigrationReport wrongTarget = verifier.verify(spec,
                    List.of(new TableResult("src_tbl", "other_tgt", 1, 1, 0, List.of())), null);

            assertThat(missing.overall()).isEqualTo(Status.FAIL);
            assertThat(missing.tables().get(0).note()).contains("cardinality/identity");
            assertThat(wrongTarget.overall()).isEqualTo(Status.FAIL);
            assertThat(wrongTarget.tables().get(0).note()).contains("src_tbl -> tgt_tbl", "other_tgt");
        }
    }

    /**
     * [ADR-0029 L3b] 승인 격리. 격리한 행은 적재하지 않았을 뿐 읽은 행이다 — 조회 = 변환 + 격리여야 PASS 이고, 격리 집계는
     * mapping 의 isolate 선언(원장 행·컬럼·위반, 원장 행마다 상한)과 맞아야 한다. 기록 = 변환은 그대로다.
     */
    @Nested
    @DisplayName("승인 행 격리")
    class ApprovedIsolation {

        private static final IsolationTally.Isolation TWO_PLACEHOLDERS =
                new IsolationTally.Isolation("U4", "end_ymd", "PLACEHOLDER_DATE", 2, List.of(3L, 7L));

        private static MappingSpec isolating(long maxRows, String... violations) {
            MappingSpec.ColumnMapping endYmd = new MappingSpec.ColumnMapping("END_YMD", "end_ymd", "ymd8", null, null,
                    null, null, null, List.of(), new MappingSpec.Isolate("U4", maxRows, List.of(violations)));
            MappingSpec.TableMapping table = new MappingSpec.TableMapping("src_tbl", "tgt_tbl", null, "ID", "id",
                    List.of(endYmd), null);
            return new MappingSpec(null, null, List.of(table), Map.of());
        }

        private static TableResult isolated(long read, long transformed, long written, long isolated,
                                            IsolationTally.Isolation... groups) {
            return new TableResult("src_tbl", "tgt_tbl", read, transformed, written, List.of(), List.of(), Map.of(),
                    isolated, List.of(groups));
        }

        @Test
        @DisplayName("조회 = 변환 + 격리이고 격리가 선언 안이면 PASS 다(commit·dry-run)")
        void readEqualsTransformedPlusIsolatedPasses() {
            MappingSpec spec = isolating(3, "PLACEHOLDER_DATE");
            TableResult result = isolated(10, 8, 8, 2, TWO_PLACEHOLDERS);

            MigrationReport commit = verifier.verify(spec, List.of(result), targetWithRows(8));
            MigrationReport dryRun = verifier.verify(spec, List.of(isolated(10, 8, 0, 2, TWO_PLACEHOLDERS)), null);

            assertThat(commit.overall()).as(commit.toSummary()).isEqualTo(Status.PASS);
            assertThat(commit.tables()).singleElement().satisfies(table -> assertThat(table.isolated()).isEqualTo(2));
            assertThat(commit.toSummary()).contains("isolated=2");
            assertThat(dryRun.overall()).as(dryRun.toSummary()).isEqualTo(Status.PASS);
        }

        @Test
        @DisplayName("조회가 변환 + 격리와 다르면 FAIL 이다 — 어느 행이 사라졌는지 증명할 수 없다")
        void aGapBetweenReadAndTransformedPlusIsolatedFails() {
            MigrationReport report = verifier.verify(isolating(3, "PLACEHOLDER_DATE"),
                    List.of(isolated(10, 7, 7, 2, TWO_PLACEHOLDERS)), targetWithRows(7));

            assertThat(report.overall()).isEqualTo(Status.FAIL);
            assertThat(report.tables().getFirst().note()).isEqualTo("조회(10) ≠ 변환(7) + 격리(2) — 격리 집계 불일치");
        }

        @Test
        @DisplayName("격리해도 기록 = 변환은 그대로 본다")
        void writtenMustStillEqualTransformed() {
            MigrationReport report = verifier.verify(isolating(3, "PLACEHOLDER_DATE"),
                    List.of(isolated(10, 8, 7, 2, TWO_PLACEHOLDERS)), targetWithRows(7));

            assertThat(report.overall()).isEqualTo(Status.FAIL);
            assertThat(report.tables().getFirst().note()).contains("쓰기 유실");
        }

        @Test
        @DisplayName("원장 행마다 상한·선언·순번이 맞지 않는 격리 집계는 FAIL 이다")
        void isolationsMustStayWithinTheDeclarationAndItsCap() {
            assertThat(verifier.verify(isolating(1, "PLACEHOLDER_DATE"),
                    List.of(isolated(10, 8, 8, 2, TWO_PLACEHOLDERS)), targetWithRows(8)).tables().getFirst().note())
                    .isEqualTo("격리 상한 초과(원장 행 U4, 상한 1): 격리 2행");
            assertThat(verifier.verify(isolating(3, "INVALID_DATE"),
                    List.of(isolated(10, 8, 8, 2, TWO_PLACEHOLDERS)), targetWithRows(8)).tables().getFirst().note())
                    .isEqualTo("선언하지 않은 격리: 원장 행 U4, end_ymd, PLACEHOLDER_DATE");
            assertThat(verifier.verify(isolating(3, "PLACEHOLDER_DATE"),
                    List.of(isolated(10, 8, 8, 2, new IsolationTally.Isolation("U4", "end_ymd", "PLACEHOLDER_DATE", 2,
                            List.of(3L, 11L)))), targetWithRows(8)).tables().getFirst().note())
                    .isEqualTo("격리 행 순번이 조회 범위 밖: 원장 행 U4");
            assertThat(verifier.verify(isolating(3, "PLACEHOLDER_DATE"),
                    List.of(isolated(10, 7, 7, 3, TWO_PLACEHOLDERS)), targetWithRows(7)).tables().getFirst().note())
                    .isEqualTo("격리 행 수(3) ≠ 격리 순번(2) — 격리 집계 불일치");
            MappingSpec undeclared = new MappingSpec(null, null, List.of(new MappingSpec.TableMapping(
                    "src_tbl", "tgt_tbl", null, List.of(), null)), Map.of());
            assertThat(verifier.verify(undeclared, List.of(isolated(10, 8, 8, 2, TWO_PLACEHOLDERS)), targetWithRows(8))
                    .overall()).as("isolate 선언이 없는 표의 격리").isEqualTo(Status.FAIL);
        }

        @Test
        @DisplayName("상한·순번 범위의 경계 안쪽은 PASS 이고 한 칸 바깥은 FAIL 이다")
        void theCapAndTheOrdinalRangeAreInclusive() {
            IsolationTally.Isolation firstAndLast =
                    new IsolationTally.Isolation("U4", "end_ymd", "PLACEHOLDER_DATE", 2, List.of(1L, 10L));

            MigrationReport atTheEdges = verifier.verify(isolating(2, "PLACEHOLDER_DATE"),
                    List.of(isolated(10, 8, 8, 2, firstAndLast)), targetWithRows(8));

            assertThat(atTheEdges.overall()).as(atTheEdges.toSummary()).isEqualTo(Status.PASS);
            assertThat(verifier.verify(isolating(2, "PLACEHOLDER_DATE"),
                    List.of(isolated(10, 8, 8, 2, new IsolationTally.Isolation("U4", "end_ymd", "PLACEHOLDER_DATE", 2,
                            List.of(0L, 10L)))), targetWithRows(8)).tables().getFirst().note())
                    .isEqualTo("격리 행 순번이 조회 범위 밖: 원장 행 U4");
        }

        @Test
        @DisplayName("증명할 수 없는 격리 집계는 PASS 가 아니다")
        void isolationTalliesThatCannotBeProvenFail() {
            MappingSpec spec = isolating(3, "PLACEHOLDER_DATE");

            assertThat(verifier.verify(spec, List.of(isolated(10, 10, 10, -1)), targetWithRows(10)).tables()
                    .getFirst().note()).isEqualTo("격리 행 수가 음수 — 격리 집계를 증명할 수 없음");
            assertThat(verifier.verify(spec, List.of(isolated(10, 10, 10, 0, TWO_PLACEHOLDERS)), targetWithRows(10))
                    .tables().getFirst().note()).as("격리 행이 0 인데 순번이 있다")
                    .isEqualTo("격리 행 수(0) ≠ 격리 순번(2) — 격리 집계 불일치");
            assertThat(verifier.verify(spec, List.of(isolated(10, 8, 8, 2)), targetWithRows(8)).tables().getFirst()
                    .note()).as("격리 행이 있는데 순번이 없다").isEqualTo("격리 행 수(2) ≠ 격리 순번(0) — 격리 집계 불일치");
            assertThat(verifier.verify(spec, List.of(isolated(10, 8, 8, 2, new IsolationTally.Isolation("U4",
                    "end_ymd", "PLACEHOLDER_DATE", 3, List.of(3L, 7L)))), targetWithRows(8)).tables().getFirst()
                    .note()).isEqualTo("격리 행 수와 순번 수가 다름: 원장 행 U4");
            assertThat(verifier.verify(isolating(0, "PLACEHOLDER_DATE"),
                    List.of(isolated(10, 8, 8, 2, TWO_PLACEHOLDERS)), targetWithRows(8)).tables().getFirst().note())
                    .isEqualTo("isolate 선언이 올바르지 않아 격리 집계를 증명할 수 없음");
            MappingSpec otherTable = new MappingSpec(null, null, List.of(new MappingSpec.TableMapping(
                    "other_tbl", "tgt_tbl", null, List.of(), null)), Map.of());
            MigrationReport unmatched = verifier.verify(otherTable, List.of(isolated(10, 8, 0, 2, TWO_PLACEHOLDERS)),
                    null);
            assertThat(unmatched.overall()).isEqualTo(Status.FAIL);
            assertThat(unmatched.tables()).extracting(TableReport::note)
                    .as("실행 계약 불일치와 따로 그 표의 격리 집계도 증명하지 않는다")
                    .contains("격리 집계를 대조할 매핑을 찾을 수 없음");
        }
    }

    /**
     * [ADR-0029 L3e] 같은 세션 보관 덤프와 격리 키 반출. 덤프 행 수 = 그 읽기의 행 수 = 표의 조회 수, 선언한 덤프마다 결과 하나,
     * COMMIT 의 파일 증거, 격리 행 수 = 반출 행 수가 맞아야 PASS 다. 어긋나면 마지막 {@code <archives>} 행이 FAIL 이다.
     */
    @Nested
    @DisplayName("보관 덤프·격리 키 반출")
    class ArchiveDumps {

        private static final String SHA = "f".repeat(64);
        private static final IsolationTally.Isolation TWO =
                new IsolationTally.Isolation("U4", "end_ymd", "PLACEHOLDER_DATE", 2, List.of(3L, 7L));

        private static MappingSpec archiving(boolean withArchives) {
            MappingSpec.ColumnMapping endYmd = new MappingSpec.ColumnMapping("END_YMD", "end_ymd", "ymd8", null, null,
                    null, null, null, List.of(), new MappingSpec.Isolate("U4", 3L, List.of("PLACEHOLDER_DATE")));
            MappingSpec.TableMapping table = new MappingSpec.TableMapping("src_tbl", "tgt_tbl", null, "ID", "id",
                    List.of(endYmd), null);
            List<MappingSpec.ArchiveDump> archives = withArchives ? List.of(
                    new MappingSpec.ArchiveDump("src_dump", "src_tbl", null, List.of(), List.of("ETC1"),
                            List.of("U7"), "2031-12-31"),
                    new MappingSpec.ArchiveDump("log_dump", "log_tbl", null, List.of("LOG_NO"), List.of("MEMO"),
                            List.of("L2"), "2029-12-31")) : List.of();
            return new MappingSpec(null, null, List.of(table), Map.of(), null, null, archives);
        }

        private static TableResult loaded(long isolated) {
            return new TableResult("src_tbl", "tgt_tbl", 10, 10 - isolated, 10 - isolated, List.of(), List.of(),
                    Map.of(), isolated, isolated == 0 ? List.of() : List.of(TWO));
        }

        private static ArchiveOutcome.Dumped mapped(long rows, long sourceRows, String file, long bytes, String sha) {
            return new ArchiveOutcome.Dumped("src_dump", "src_tbl", false, sourceRows, rows, file, bytes, sha,
                    "2031-12-31", List.of("U7"), Map.of());
        }

        private static ArchiveOutcome.Dumped log(boolean dumpOnly, String file) {
            return new ArchiveOutcome.Dumped("log_dump", "log_tbl", dumpOnly, 3, 3, file, file == null ? 0 : 9,
                    file == null ? null : SHA, "2029-12-31", List.of("L2"), Map.of());
        }

        private static ArchiveOutcome.KeyExport export(String source, long rows, String sha) {
            return new ArchiveOutcome.KeyExport(source, rows, "isolated-" + source + ".jsonl", 7, sha);
        }

        private static ArchiveOutcome written(List<ArchiveOutcome.Dumped> dumps, List<ArchiveOutcome.KeyExport> exports) {
            return new ArchiveOutcome(true, dumps, exports, List.of());
        }

        private static final ArchiveOutcome COMPLETE = written(
                List.of(mapped(10, 10, "archive-src.jsonl", 11, SHA), log(true, "archive-log.jsonl")),
                List.of(export("src_tbl", 2, SHA)));

        private String note(MappingSpec spec, TableResult result, JdbcTemplate target, ArchiveOutcome outcome) {
            MigrationReport report = verifier.verify(spec, List.of(result), target, outcome);
            assertThat(report.overall()).as(report.toSummary()).isEqualTo(Status.FAIL);
            assertThat(report.tables().getLast().source()).isEqualTo("<archives>");
            assertThat(report.tables().getLast().errors()).isEqualTo(1);
            return report.tables().getLast().note();
        }

        private String commitNote(ArchiveOutcome outcome) {
            return note(archiving(true), loaded(2), targetWithRows(8), outcome);
        }

        @Test
        @DisplayName("덤프·반출이 실행과 맞으면 PASS 다(commit·dry-run)")
        void matchingDumpsAndExportsPass() {
            MigrationReport commit = verifier.verify(archiving(true), List.of(loaded(2)), targetWithRows(8), COMPLETE);
            MigrationReport dryRun = verifier.verify(archiving(true), List.of(new TableResult("src_tbl", "tgt_tbl", 10,
                    8, 0, List.of(), List.of(), Map.of(), 2, List.of(TWO))), null, new ArchiveOutcome(false,
                    List.of(mapped(10, 10, null, 0, null), log(true, null)), List.of(), List.of()));
            MigrationReport noIsolation = verifier.verify(archiving(true), List.of(loaded(0)), targetWithRows(10),
                    written(COMPLETE.dumps(), List.of()));

            assertThat(commit.overall()).as(commit.toSummary()).isEqualTo(Status.PASS);
            assertThat(commit.tables()).extracting(TableReport::source).containsExactly("src_tbl");
            assertThat(dryRun.overall()).as(dryRun.toSummary()).isEqualTo(Status.PASS);
            assertThat(noIsolation.overall()).as(noIsolation.toSummary()).isEqualTo(Status.PASS);
            assertThat(verifier.verify(archiving(false), List.of(loaded(2)), targetWithRows(8)).overall())
                    .as("보관 선언 없이 결과 없이 검증하면 격리 반출은 보지 않는다").isEqualTo(Status.PASS);
        }

        @Test
        @DisplayName("덤프 결과가 없거나 실패했거나 모드와 맞지 않으면 FAIL 이다")
        void missingFailedOrModeMismatchedOutcomesFail() {
            assertThat(note(archiving(true), loaded(2), targetWithRows(8), null))
                    .isEqualTo("보관 선언이 있는데 보관 덤프 결과가 없음 — 덤프를 증명할 수 없음");
            assertThat(verifier.verify(archiving(true), List.of(loaded(2)), targetWithRows(8)).overall())
                    .as("결과 없는 3인자 검증도 보관 선언이 있으면 FAIL").isEqualTo(Status.FAIL);
            assertThat(commitNote(new ArchiveOutcome(true, COMPLETE.dumps(), COMPLETE.keyExports(),
                    List.of("보관 덤프 읽기 실패(log_tbl): SQL_EXECUTION_FAILED"))))
                    .isEqualTo("보관 덤프·격리 키 반출 실패 — 보관 덤프 읽기 실패(log_tbl): SQL_EXECUTION_FAILED");
            assertThat(note(archiving(false), loaded(2), targetWithRows(8),
                    new ArchiveOutcome(false, List.of(), List.of(), List.of())))
                    .as("isolate 만 있어도 COMMIT 은 파일을 써야 한다")
                    .isEqualTo("보관 디렉터리 없이 적재함 — 덤프·격리 키를 증명할 수 없음");
            assertThat(note(archiving(true), new TableResult("src_tbl", "tgt_tbl", 10, 8, 0, List.of(), List.of(),
                    Map.of(), 2, List.of(TWO)), null, COMPLETE)).isEqualTo("dry-run 이 보관 파일을 씀");
        }

        @Test
        @DisplayName("선언한 덤프마다 결과가 정확히 하나이고 선언과 같아야 한다")
        void everyDeclaredDumpHasExactlyOneMatchingResult() {
            ArchiveOutcome.Dumped src = COMPLETE.dumps().getFirst();
            ArchiveOutcome.Dumped logDump = COMPLETE.dumps().get(1);
            List<ArchiveOutcome.KeyExport> exports = COMPLETE.keyExports();

            assertThat(commitNote(written(List.of(src, src, logDump), exports)))
                    .isEqualTo("보관 덤프 결과가 두 번 있음: src_dump");
            assertThat(commitNote(written(List.of(src), exports))).isEqualTo("보관 덤프 결과 없음: log_dump");
            assertThat(commitNote(written(List.of(new ArchiveOutcome.Dumped("src_dump", "src_tbl", false, 10, 10,
                    "f", 1, SHA, "2032-12-31", List.of("U7"), Map.of()), logDump), exports)))
                    .isEqualTo("보관 덤프 결과가 선언(보존 기한·원장 행)과 다름: src_dump");
            assertThat(commitNote(written(List.of(new ArchiveOutcome.Dumped("src_dump", "src_tbl", false, 10, 10,
                    "f", 1, SHA, "2031-12-31", List.of("U8"), Map.of()), logDump), exports)))
                    .isEqualTo("보관 덤프 결과가 선언(보존 기한·원장 행)과 다름: src_dump");
            assertThat(commitNote(written(List.of(src, logDump, new ArchiveOutcome.Dumped("extra", "src_tbl", false,
                    10, 10, "f", 1, SHA, null, List.of(), Map.of())), exports)))
                    .isEqualTo("선언하지 않은 보관 덤프: extra");
        }

        @Test
        @DisplayName("덤프 행 수 = 읽은 행 수 = 매핑된 표의 조회 수다")
        void dumpRowsEqualTheRowsReadAndTheTableRead() {
            ArchiveOutcome.Dumped logDump = COMPLETE.dumps().get(1);
            List<ArchiveOutcome.KeyExport> exports = COMPLETE.keyExports();

            assertThat(commitNote(written(List.of(mapped(9, 10, "f", 1, SHA), logDump), exports)))
                    .isEqualTo("보관 덤프 행(9) ≠ 읽은 행(10): src_dump");
            assertThat(commitNote(written(List.of(mapped(11, 10, "f", 1, SHA), logDump), exports)))
                    .isEqualTo("보관 덤프 행(11) ≠ 읽은 행(10): src_dump");
            assertThat(commitNote(written(List.of(mapped(9, 9, "f", 1, SHA), logDump), exports)))
                    .isEqualTo("보관 덤프 행(9) ≠ 조회(10): src_dump");
            assertThat(commitNote(written(List.of(new ArchiveOutcome.Dumped("src_dump", "src_tbl", true, 10, 10, "f",
                    1, SHA, "2031-12-31", List.of("U7"), Map.of()), logDump), exports)))
                    .as("매핑된 표의 덤프를 덤프만 한 것으로 기록").isEqualTo("보관 덤프 행(10) ≠ 조회(10): src_dump");
            assertThat(commitNote(written(List.of(COMPLETE.dumps().getFirst(), log(false, "f")), exports)))
                    .isEqualTo("덤프만 하는 표의 보관이 매핑된 표로 기록됨: log_dump");
            MappingSpec otherTable = new MappingSpec(null, null, List.of(new MappingSpec.TableMapping("src_tbl",
                    "tgt_tbl", null, "ID", "id", List.of(), null)), Map.of(), null, null, archiving(true).archives());
            assertThat(MigrationVerifier.archiveError(otherTable, List.of(new TableResult("x_tbl", "tgt_tbl", 10, 10, 10,
                    List.of())), COMPLETE, true)).isEqualTo("보관 덤프 행(10) ≠ 조회(-): src_dump");
        }

        @Test
        @DisplayName("COMMIT 덤프는 파일 이름·바이트·SHA-256 이 있고 dry-run 덤프에는 파일이 없다")
        void commitDumpsCarryFileEvidenceAndDryRunDumpsDoNot() {
            ArchiveOutcome.Dumped logDump = COMPLETE.dumps().get(1);
            List<ArchiveOutcome.KeyExport> exports = COMPLETE.keyExports();

            for (ArchiveOutcome.Dumped broken : List.of(mapped(10, 10, null, 11, SHA), mapped(10, 10, "f", 0, SHA),
                    mapped(10, 10, "f", 11, null), mapped(10, 10, "f", 11, "F".repeat(64)))) {
                assertThat(commitNote(written(List.of(broken, logDump), exports)))
                        .isEqualTo("보관 덤프 파일 증거가 모드와 맞지 않음: src_dump");
            }
            assertThat(note(archiving(true), new TableResult("src_tbl", "tgt_tbl", 10, 8, 0, List.of(), List.of(),
                    Map.of(), 2, List.of(TWO)), null, new ArchiveOutcome(false, List.of(mapped(10, 10, "f", 0, null),
                    log(true, null)), List.of(), List.of())))
                    .isEqualTo("보관 덤프 파일 증거가 모드와 맞지 않음: src_dump");
        }

        @Test
        @DisplayName("COMMIT 에서 격리한 행이 있는 표마다 반출이 하나이고 반출 행 수 = 격리 수다")
        void isolatedRowsAreExportedOncePerTableWithTheSameCount() {
            List<ArchiveOutcome.Dumped> dumps = COMPLETE.dumps();

            assertThat(commitNote(written(dumps, List.of()))).isEqualTo("격리 키 반출(0) ≠ 격리(2): src_tbl");
            assertThat(commitNote(written(dumps, List.of(export("src_tbl", 1, SHA)))))
                    .isEqualTo("격리 키 반출(1) ≠ 격리(2): src_tbl");
            assertThat(commitNote(written(dumps, List.of(export("src_tbl", 2, null)))))
                    .isEqualTo("격리 키 반출(2) ≠ 격리(2): src_tbl");
            assertThat(commitNote(written(dumps, List.of(export("src_tbl", 2, "x")))))
                    .isEqualTo("격리 키 반출(2) ≠ 격리(2): src_tbl");
            assertThat(commitNote(written(dumps, List.of(new ArchiveOutcome.KeyExport("src_tbl", 2, null, 7, SHA)))))
                    .isEqualTo("격리 키 반출(2) ≠ 격리(2): src_tbl");
            assertThat(commitNote(written(dumps, List.of(export("src_tbl", 2, SHA), export("SRC_TBL", 2, SHA)))))
                    .isEqualTo("격리 키 반출이 모드와 맞지 않거나 두 번 있음: SRC_TBL");
            assertThat(commitNote(written(dumps, List.of(export("src_tbl", 2, SHA), export("other_tbl", 1, SHA)))))
                    .isEqualTo("실행 결과에 없는 표의 격리 키 반출: other_tbl");
            assertThat(note(archiving(true), loaded(0), targetWithRows(10), written(dumps,
                    List.of(export("src_tbl", 1, SHA))))).isEqualTo("격리하지 않은 표의 격리 키 반출: src_tbl");
            assertThat(note(archiving(true), new TableResult("src_tbl", "tgt_tbl", 10, 8, 0, List.of(), List.of(),
                    Map.of(), 2, List.of(TWO)), null, new ArchiveOutcome(false,
                    List.of(mapped(10, 10, null, 0, null), log(true, null)), List.of(export("src_tbl", 2, SHA)),
                    List.of()))).isEqualTo("격리 키 반출이 모드와 맞지 않거나 두 번 있음: src_tbl");
        }
    }

    @Nested
    @DisplayName("리포트 출력")
    class Reporting {

        @Test
        @DisplayName("ok() 는 strict 성공인 PASS 에서만 true 다")
        void okIsTrueOnlyForPass() {
            assertThat(new MigrationReport(List.of(), Status.PASS).ok()).isTrue();
            assertThat(new MigrationReport(List.of(), Status.WARN).ok()).isFalse();
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
        @DisplayName("타깃 행수 0 은 '-' 가 아니라 0 으로 적는다 — 대조 불가와 구분된다")
        void zeroTargetRowsIsPrintedAsZero() {
            // `targetRows < 0` 의 경계를 `<= 0` 으로 옮긴 뮤턴트가 여기서 죽는다.
            //   0 을 '-'(대조 불가)로 적으면 **타깃이 비어 있다는 사실**이 가려진다 —
            //   그것은 유령 기록의 가장 심한 형태다.
            JdbcTemplate jt = mock(JdbcTemplate.class);
            given(jt.queryForObject(anyString(), eq(Long.class))).willReturn(0L);

            String summary = verifier.verify(List.of(result(10, 10, 10)), jt).toSummary();

            assertThat(summary).contains("targetRows=0");
            assertThat(summary).doesNotContain("targetRows=-");
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
