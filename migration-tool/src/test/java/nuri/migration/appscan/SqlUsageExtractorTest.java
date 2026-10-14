package nuri.migration.appscan;

import nuri.migration.appscan.AppUsageReport.ColumnUsage;
import nuri.migration.appscan.AppUsageReport.FileCounts;
import nuri.migration.appscan.AppUsageReport.UsageEvidence;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.regex.Pattern;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.tuple;

class SqlUsageExtractorTest {

    private static final FileCounts NO_FILES = new FileCounts(0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0);

    @Test
    void searchedCaseAndDecodeYieldCodeLabelsWithTheLineTheyAreOn() {
        AppUsageReport report = extract("""
                SELECT CASE WHEN T.STAT_CD = 'A' THEN '승인'
                            WHEN T.STAT_CD = 'R' THEN '반려' END AS STAT_NM,
                       DECODE(T.SEX_CD, 'M', '남', 'F', '여', '-') AS SEX_NM
                  FROM TB_USER T
                """, 10);

        assertThat(usages(report, "STAT_CD")).extracting(UsageEvidence::kind, UsageEvidence::value,
                        UsageEvidence::label, UsageEvidence::line, UsageEvidence::table)
                .containsExactly(tuple("SQL_CASE", "A", "승인", 10, "TB_USER"),
                        tuple("SQL_CASE", "R", "반려", 11, "TB_USER"));
        assertThat(usages(report, "SEX_CD")).extracting(UsageEvidence::value, UsageEvidence::label,
                        UsageEvidence::line)
                .containsExactly(tuple("F", "여", 12), tuple("M", "남", 12));
    }

    @Test
    void literalsAfterThenAreResultsNotComparisonsAndKeywordsAreNotColumns() {
        AppUsageReport report = extract("""
                SELECT A.CODE_ID FROM TB_CODE A
                 WHERE A.USE_YN = 'Y' AND NOT EXISTS (SELECT 1 FROM DUAL)
                   AND CASE WHEN A.GRP = 'X' THEN 'Y' ELSE 'N' END = 'Y'
                """, 1);

        assertThat(usages(report, "USE_YN")).extracting(UsageEvidence::kind, UsageEvidence::value,
                        UsageEvidence::line)
                .containsExactly(tuple("SQL_LITERAL", "Y", 2));
        assertThat(report.columns()).extracting(ColumnUsage::column)
                .doesNotContain("END", "THEN", "AND", "WHERE", "EXISTS");
        assertThat(report.tables()).extracting(AppUsageReport.TableReference::table).containsExactly("TB_CODE");
    }

    @Test
    void commaSeparatedFromListsResolveAliasesForQualifiedColumns() {
        AppUsageReport report = extract("""
                SELECT U.USER_NM AS userNm, D.DEPT_NM AS DEPT_NM, U.REG_DT reg_date
                  FROM TB_USER U, TB_DEPT AS D
                 WHERE U.DEPT_ID = D.DEPT_ID
                """, 1);

        assertThat(usages(report, "USER_NM")).extracting(UsageEvidence::table, UsageEvidence::detail)
                .containsExactly(tuple("TB_USER", "userNm"));
        assertThat(usages(report, "REG_DT")).extracting(UsageEvidence::detail).containsExactly("reg_date");
        assertThat(usages(report, "DEPT_NM")).as("같은 이름의 별칭은 사용처가 아니다").isEmpty();
        assertThat(usages(report, "DEPT_ID")).extracting(UsageEvidence::table, UsageEvidence::detail)
                .containsExactly(tuple("TB_DEPT", "TB_USER.DEPT_ID"), tuple("TB_USER", "TB_DEPT.DEPT_ID"));
        assertThat(report.tables()).extracting(AppUsageReport.TableReference::table)
                .containsExactly("TB_DEPT", "TB_USER");
    }

    @Test
    void insertAndUpdateClassifyEachAssignedExpression() {
        AppUsageReport report = extract("""
                INSERT INTO TB_LOG (LOG_ID, LOG_DT, LOG_SE, MEMO, CNT)
                VALUES (#{logId,jdbcType=VARCHAR}, CURRENT_TIMESTAMP, 'L', CONCAT('a', ','), 1);
                UPDATE TB_LOG L SET L.UPD_DT = GETDATE(), L.MEMO = #memo#, L.LOG_SE = 'U' WHERE L.LOG_ID = #logId#
                """, 1);

        assertThat(usages(report, "LOG_ID")).extracting(UsageEvidence::kind, UsageEvidence::detail)
                .contains(tuple("SQL_BINDING", "logId"));
        assertThat(usages(report, "LOG_DT")).extracting(UsageEvidence::kind, UsageEvidence::detail)
                .containsExactly(tuple("SQL_CURRENT_TIME", "CURRENT_TIMESTAMP"));
        assertThat(usages(report, "LOG_SE")).extracting(UsageEvidence::value).containsExactly("L", "U");
        assertThat(usages(report, "UPD_DT")).extracting(UsageEvidence::detail, UsageEvidence::line)
                .containsExactly(tuple("GETDATE", 3));
        assertThat(usages(report, "MEMO")).extracting(UsageEvidence::kind, UsageEvidence::detail)
                .containsExactly(tuple("SQL_BINDING", "memo"));
        assertThat(usages(report, "CNT")).as("숫자 리터럴은 코드 근거가 아니다").isEmpty();
    }

    @Test
    void insertWithMismatchedColumnAndValueCountsIsNotPaired() {
        AppUsageReport report = extract("INSERT INTO TB_X (A_CD, B_CD) VALUES ('1')", 1);

        assertThat(usages(report, "A_CD")).isEmpty();
        assertThat(report.tables()).extracting(AppUsageReport.TableReference::table).containsExactly("TB_X");
    }

    @Test
    void commentsAreBlankedButKeepLinePositions() {
        AppUsageReport report = extract("""
                /* WHERE OLD_CD = 'Z' */
                -- AND GONE_CD = 'Q'
                SELECT * FROM TB_A WHERE NEW_CD = 'N'
                """, 5);

        assertThat(report.columns()).extracting(ColumnUsage::column).containsExactly("NEW_CD");
        assertThat(usages(report, "NEW_CD")).extracting(UsageEvidence::line).containsExactly(7);
    }

    @Test
    void topLevelSplitIgnoresCommasInsideParenthesesBracesAndQuotes() {
        assertThat(SqlUsageExtractor.splitTopLevel("A, F(B, C), '{x, y}', #{p, jdbcType=X}, D"))
                .containsExactly("A", " F(B, C)", " '{x, y}'", " #{p, jdbcType=X}", " D");
        assertThat(SqlUsageExtractor.splitTopLevel("A)), B")).containsExactly("A))", " B");
    }

    @Test
    void sourceTextKeepsLinesWhenBlankingAndCountsThemFromOne() {
        String text = "a\n/*b\nc*/d\ne";
        String blanked = SourceText.blank(text, Pattern.compile("/\\*.*?\\*/", Pattern.DOTALL));

        assertThat(blanked).isEqualTo("a\n   \n   d\ne");
        assertThat(SourceText.lineOf(text, 0)).isEqualTo(1);
        assertThat(SourceText.lineOf(text, 2)).isEqualTo(2);
        assertThat(SourceText.lineOf(text, text.length())).isEqualTo(4);
        assertThat(SourceText.lineOf(text, text.length() + 10)).isEqualTo(4);
    }

    private static AppUsageReport extract(String sql, int baseLine) {
        UsageCollector collector = new UsageCollector();
        new SqlUsageExtractor(collector).extract(sql, "sql/Test.xml", baseLine);
        return collector.report(NO_FILES);
    }

    private static List<UsageEvidence> usages(AppUsageReport report, String column) {
        return report.columns().stream().filter(usage -> usage.column().equals(column)).findFirst()
                .map(ColumnUsage::usages).orElse(List.of());
    }
}
