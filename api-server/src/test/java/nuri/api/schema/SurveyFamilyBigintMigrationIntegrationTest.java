package nuri.api.schema;

import org.flywaydb.core.api.MigrationVersion;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;

import java.sql.Connection;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;

import static org.assertj.core.api.Assertions.assertThat;

@Tag("schema-validation")
@DisplayName("설문 5개 기술 PK와 응답자 복합 참조키 → BIGINT 데이터 마이그레이션")
class SurveyFamilyBigintMigrationIntegrationTest extends SharedPostgresMigrationTestSupport {

    @Test
    @DisplayName("기존 설문 전체 관계와 응답자 복합키를 보존하고 5개 기술 PK를 자동 숫자 키로 전환한다")
    void migratesExistingSurveyGraphAndEnforcesIdentityGeneration() throws SQLException {
        flyway(MigrationVersion.fromVersion("2.67")).migrate();

        try (Connection connection = openConnection();
             Statement statement = connection.createStatement()) {
            statement.executeUpdate("""
                    INSERT INTO tb_srvy_tmplt (
                        srvy_tmplt_id, srvy_tmplt_type_cd, srvy_tmplt_expln,
                        srvy_tmplt_path_nm, frst_rgtr_id
                    ) VALUES (
                        'TMPLT_LEGACY_000001', 'BASIC', '기존 템플릿', '/legacy', 'admin'
                    )
                    """);
            statement.executeUpdate("""
                    INSERT INTO tb_srvy_info (
                        srvy_id, srvy_tmplt_id, srvy_ttl, srvy_prps,
                        srvy_bgng_ymd, srvy_end_ymd, frst_rgtr_id
                    ) VALUES (
                        'SRVY_LEGACY_000001', 'TMPLT_LEGACY_000001', '기존 설문', '보존 목적',
                        '20260801', '20260831', 'admin'
                    )
                    """);
            statement.executeUpdate("""
                    INSERT INTO tb_srvy_qstn (
                        srvy_qstn_id, srvy_id, srvy_tmplt_id, qstn_sn,
                        qstn_type_cd, qstn_cn, max_chc_cnt, frst_rgtr_id
                    ) VALUES (
                        'QSTN_LEGACY_000001', 'SRVY_LEGACY_000001', 'TMPLT_LEGACY_000001', 1,
                        'SINGLE', '기존 질문', 1, 'admin'
                    )
                    """);
            statement.executeUpdate("""
                    INSERT INTO tb_srvy_artcl (
                        srvy_artcl_id, srvy_qstn_id, srvy_id, srvy_tmplt_id,
                        artcl_sn, artcl_cn, etc_ans_yn, frst_rgtr_id
                    ) VALUES (
                        'ARTCL_LEGACY_000001', 'QSTN_LEGACY_000001', 'SRVY_LEGACY_000001',
                        'TMPLT_LEGACY_000001', 1, '기존 항목', 'N', 'admin'
                    )
                    """);
            statement.executeUpdate("""
                    INSERT INTO tb_srvy_rslt (
                        srvy_rspns_id, srvy_id, srvy_tmplt_id, srvy_qstn_id, srvy_artcl_id,
                        rspdnt_ans_cn, rspns_nm, frst_rgtr_id
                    ) VALUES (
                        'RSPNS_LEGACY_000001', 'SRVY_LEGACY_000001', 'TMPLT_LEGACY_000001',
                        'QSTN_LEGACY_000001', 'ARTCL_LEGACY_000001', '기존 답변', '응답자', 'voter'
                    )
                    """);
            statement.executeUpdate("""
                    INSERT INTO tb_srvy_rspdnt (
                        srvy_tmplt_id, srvy_id, srvy_rspdnt_id, rspdnt_nm, frst_rgtr_id
                    ) VALUES (
                        'TMPLT_LEGACY_000001', 'SRVY_LEGACY_000001',
                        'RSPDNT_LEGACY_000001', '기존 응답자', 'admin'
                    )
                    """);
        }

        flyway(null).migrate();

        try (Connection connection = openConnection();
             Statement statement = connection.createStatement()) {
            long templateSn;
            long surveySn;
            long questionSn;
            long articleSn;
            long responseSn;
            try (ResultSet rows = statement.executeQuery("""
                    SELECT t.srvy_tmplt_sn, i.srvy_sn, q.srvy_qstn_sn,
                           a.srvy_artcl_sn, r.srvy_rspns_sn,
                           i.srvy_tmplt_sn AS info_template_sn,
                           q.srvy_sn AS question_survey_sn, q.srvy_tmplt_sn AS question_template_sn,
                           a.srvy_sn AS article_survey_sn, a.srvy_qstn_sn AS article_question_sn,
                           a.srvy_tmplt_sn AS article_template_sn,
                           r.srvy_sn AS response_survey_sn, r.srvy_qstn_sn AS response_question_sn,
                           r.srvy_artcl_sn AS response_article_sn, r.srvy_tmplt_sn AS response_template_sn,
                           d.srvy_sn AS respondent_survey_sn, d.srvy_tmplt_sn AS respondent_template_sn,
                           d.srvy_rspdnt_id, i.srvy_ttl, q.qstn_cn, a.artcl_cn,
                           r.rspdnt_ans_cn, d.rspdnt_nm
                    FROM tb_srvy_tmplt t
                    JOIN tb_srvy_info i ON i.srvy_tmplt_sn = t.srvy_tmplt_sn
                    JOIN tb_srvy_qstn q ON q.srvy_sn = i.srvy_sn
                                              AND q.srvy_tmplt_sn = t.srvy_tmplt_sn
                    JOIN tb_srvy_artcl a ON a.srvy_sn = i.srvy_sn
                                                AND a.srvy_qstn_sn = q.srvy_qstn_sn
                                                AND a.srvy_tmplt_sn = t.srvy_tmplt_sn
                    JOIN tb_srvy_rslt r ON r.srvy_sn = i.srvy_sn
                                               AND r.srvy_qstn_sn = q.srvy_qstn_sn
                                               AND r.srvy_artcl_sn = a.srvy_artcl_sn
                                               AND r.srvy_tmplt_sn = t.srvy_tmplt_sn
                    JOIN tb_srvy_rspdnt d ON d.srvy_sn = i.srvy_sn
                                                 AND d.srvy_tmplt_sn = t.srvy_tmplt_sn
                    WHERE i.srvy_ttl = '기존 설문'
                    """)) {
                assertThat(rows.next()).isTrue();
                templateSn = rows.getLong("srvy_tmplt_sn");
                surveySn = rows.getLong("srvy_sn");
                questionSn = rows.getLong("srvy_qstn_sn");
                articleSn = rows.getLong("srvy_artcl_sn");
                responseSn = rows.getLong("srvy_rspns_sn");
                assertThat(templateSn).isPositive();
                assertThat(surveySn).isPositive();
                assertThat(questionSn).isPositive();
                assertThat(articleSn).isPositive();
                assertThat(responseSn).isPositive();
                assertThat(rows.getLong("info_template_sn")).isEqualTo(templateSn);
                assertThat(rows.getLong("question_survey_sn")).isEqualTo(surveySn);
                assertThat(rows.getLong("question_template_sn")).isEqualTo(templateSn);
                assertThat(rows.getLong("article_survey_sn")).isEqualTo(surveySn);
                assertThat(rows.getLong("article_question_sn")).isEqualTo(questionSn);
                assertThat(rows.getLong("article_template_sn")).isEqualTo(templateSn);
                assertThat(rows.getLong("response_survey_sn")).isEqualTo(surveySn);
                assertThat(rows.getLong("response_question_sn")).isEqualTo(questionSn);
                assertThat(rows.getLong("response_article_sn")).isEqualTo(articleSn);
                assertThat(rows.getLong("response_template_sn")).isEqualTo(templateSn);
                assertThat(rows.getLong("respondent_survey_sn")).isEqualTo(surveySn);
                assertThat(rows.getLong("respondent_template_sn")).isEqualTo(templateSn);
                assertThat(rows.getString("srvy_rspdnt_id")).isEqualTo("RSPDNT_LEGACY_000001");
                assertThat(rows.getString("qstn_cn")).isEqualTo("기존 질문");
                assertThat(rows.getString("artcl_cn")).isEqualTo("기존 항목");
                assertThat(rows.getString("rspdnt_ans_cn")).isEqualTo("기존 답변");
                assertThat(rows.getString("rspdnt_nm")).isEqualTo("기존 응답자");
                assertThat(rows.next()).isFalse();
            }

            assertOldColumnsRemoved(statement);
            assertIdentity(statement, "tb_srvy_tmplt", "srvy_tmplt_sn", "public.sq_srvy_tmplt_sn");
            assertIdentity(statement, "tb_srvy_info", "srvy_sn", "public.sq_srvy_sn");
            assertIdentity(statement, "tb_srvy_qstn", "srvy_qstn_sn", "public.sq_srvy_qstn_sn");
            assertIdentity(statement, "tb_srvy_artcl", "srvy_artcl_sn", "public.sq_srvy_artcl_sn");
            assertIdentity(statement, "tb_srvy_rslt", "srvy_rspns_sn", "public.sq_srvy_rspns_sn");

            assertThat(primaryKeyColumns(statement, "tb_srvy_tmplt")).isEqualTo("srvy_tmplt_sn");
            assertThat(primaryKeyColumns(statement, "tb_srvy_info")).isEqualTo("srvy_sn");
            assertThat(primaryKeyColumns(statement, "tb_srvy_qstn")).isEqualTo("srvy_qstn_sn");
            assertThat(primaryKeyColumns(statement, "tb_srvy_artcl")).isEqualTo("srvy_artcl_sn");
            assertThat(primaryKeyColumns(statement, "tb_srvy_rslt")).isEqualTo("srvy_rspns_sn");
            assertThat(primaryKeyColumns(statement, "tb_srvy_rspdnt"))
                    .isEqualTo("srvy_tmplt_sn,srvy_sn,srvy_rspdnt_id");

            assertThat(outboundForeignKeyCount(statement, "tb_srvy_tmplt")).isZero();
            assertThat(outboundForeignKeyCount(statement, "tb_srvy_info")).isEqualTo(1L);
            assertThat(outboundForeignKeyCount(statement, "tb_srvy_qstn")).isEqualTo(2L);
            assertThat(outboundForeignKeyCount(statement, "tb_srvy_artcl")).isEqualTo(3L);
            assertThat(outboundForeignKeyCount(statement, "tb_srvy_rslt")).isEqualTo(4L);
            assertThat(outboundForeignKeyCount(statement, "tb_srvy_rspdnt")).isEqualTo(2L);
            assertThat(inboundForeignKeyCount(statement, "tb_srvy_tmplt")).isEqualTo(5L);
            assertThat(inboundForeignKeyCount(statement, "tb_srvy_info")).isEqualTo(4L);
            assertThat(inboundForeignKeyCount(statement, "tb_srvy_qstn")).isEqualTo(2L);
            assertThat(inboundForeignKeyCount(statement, "tb_srvy_artcl")).isEqualTo(1L);
            assertThat(uniqueConstraintColumns(statement, "uk_tb_srvy_rslt_answer"))
                    .isEqualTo("srvy_sn,srvy_qstn_sn,srvy_artcl_sn,frst_rgtr_id");
            assertThat(indexExists(statement, "ix_tb_srvy_qstn_srvy_sn")).isTrue();
            assertThat(indexExists(statement, "ix_tb_srvy_artcl_srvy_qstn_sn")).isTrue();
            assertThat(indexExists(statement, "ix_tb_srvy_rslt_srvy_artcl_sn")).isTrue();
            assertThat(indexExists(statement, "ix_tb_srvy_rspdnt_srvy_sn_srvy_tmplt_sn")).isTrue();

            long generatedTemplateSn = generatedKey(statement, """
                    INSERT INTO tb_srvy_tmplt (srvy_tmplt_type_cd)
                    VALUES ('NEW') RETURNING srvy_tmplt_sn
                    """);
            long generatedSurveySn = generatedKey(statement, """
                    INSERT INTO tb_srvy_info (srvy_tmplt_sn, srvy_ttl)
                    VALUES (%d, '신규 설문') RETURNING srvy_sn
                    """.formatted(generatedTemplateSn));
            long generatedQuestionSn = generatedKey(statement, """
                    INSERT INTO tb_srvy_qstn (srvy_sn, srvy_tmplt_sn, qstn_cn)
                    VALUES (%d, %d, '신규 질문') RETURNING srvy_qstn_sn
                    """.formatted(generatedSurveySn, generatedTemplateSn));
            long generatedArticleSn = generatedKey(statement, """
                    INSERT INTO tb_srvy_artcl (srvy_qstn_sn, srvy_sn, srvy_tmplt_sn, artcl_cn)
                    VALUES (%d, %d, %d, '신규 항목') RETURNING srvy_artcl_sn
                    """.formatted(generatedQuestionSn, generatedSurveySn, generatedTemplateSn));
            long generatedResponseSn = generatedKey(statement, """
                    INSERT INTO tb_srvy_rslt (
                        srvy_sn, srvy_tmplt_sn, srvy_qstn_sn, srvy_artcl_sn, frst_rgtr_id
                    ) VALUES (%d, %d, %d, %d, 'new-voter') RETURNING srvy_rspns_sn
                    """.formatted(generatedSurveySn, generatedTemplateSn, generatedQuestionSn, generatedArticleSn));
            statement.executeUpdate("""
                    INSERT INTO tb_srvy_rspdnt (
                        srvy_tmplt_sn, srvy_sn, srvy_rspdnt_id, rspdnt_nm
                    ) VALUES (%d, %d, 'RSPDNT_NEW_00000001', '신규 응답자')
                    """.formatted(generatedTemplateSn, generatedSurveySn));

            assertThat(generatedTemplateSn).isGreaterThan(templateSn);
            assertThat(generatedSurveySn).isGreaterThan(surveySn);
            assertThat(generatedQuestionSn).isGreaterThan(questionSn);
            assertThat(generatedArticleSn).isGreaterThan(articleSn);
            assertThat(generatedResponseSn).isGreaterThan(responseSn);
        }
    }

    private void assertOldColumnsRemoved(Statement statement) throws SQLException {
        String[][] oldColumns = {
                {"tb_srvy_tmplt", "srvy_tmplt_id"},
                {"tb_srvy_info", "srvy_id"}, {"tb_srvy_info", "srvy_tmplt_id"},
                {"tb_srvy_qstn", "srvy_qstn_id"}, {"tb_srvy_qstn", "srvy_id"},
                {"tb_srvy_qstn", "srvy_tmplt_id"},
                {"tb_srvy_artcl", "srvy_artcl_id"}, {"tb_srvy_artcl", "srvy_qstn_id"},
                {"tb_srvy_artcl", "srvy_id"}, {"tb_srvy_artcl", "srvy_tmplt_id"},
                {"tb_srvy_rslt", "srvy_rspns_id"}, {"tb_srvy_rslt", "srvy_id"},
                {"tb_srvy_rslt", "srvy_tmplt_id"}, {"tb_srvy_rslt", "srvy_qstn_id"},
                {"tb_srvy_rslt", "srvy_artcl_id"},
                {"tb_srvy_rspdnt", "srvy_tmplt_id"}, {"tb_srvy_rspdnt", "srvy_id"}
        };
        for (String[] column : oldColumns) {
            assertThat(columnExists(statement, column[0], column[1]))
                    .as(column[0] + "." + column[1])
                    .isFalse();
        }
    }

    private void assertIdentity(Statement statement, String tableName, String columnName, String sequenceName)
            throws SQLException {
        try (ResultSet result = statement.executeQuery("""
                SELECT identity_generation FROM information_schema.columns
                WHERE table_schema = 'public' AND table_name = '%s' AND column_name = '%s'
                """.formatted(tableName, columnName))) {
            assertThat(result.next()).isTrue();
            assertThat(result.getString(1)).isEqualTo("BY DEFAULT");
        }
        try (ResultSet result = statement.executeQuery(
                "SELECT pg_get_serial_sequence('%s', '%s')".formatted(tableName, columnName))) {
            assertThat(result.next()).isTrue();
            assertThat(result.getString(1)).isEqualTo(sequenceName);
        }
    }

    private boolean columnExists(Statement statement, String tableName, String columnName) throws SQLException {
        try (ResultSet result = statement.executeQuery("""
                SELECT EXISTS (SELECT 1 FROM information_schema.columns
                WHERE table_schema = 'public' AND table_name = '%s' AND column_name = '%s')
                """.formatted(tableName, columnName))) {
            result.next();
            return result.getBoolean(1);
        }
    }

    private String primaryKeyColumns(Statement statement, String tableName) throws SQLException {
        try (ResultSet result = statement.executeQuery("""
                SELECT string_agg(a.attname, ',' ORDER BY k.ord)
                FROM pg_constraint c
                JOIN pg_class t ON t.oid = c.conrelid
                JOIN pg_namespace n ON n.oid = t.relnamespace
                JOIN unnest(c.conkey) WITH ORDINALITY AS k(attnum, ord) ON true
                JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = k.attnum
                WHERE n.nspname = 'public' AND t.relname = '%s' AND c.contype = 'p'
                """.formatted(tableName))) {
            assertThat(result.next()).isTrue();
            return result.getString(1);
        }
    }

    private long outboundForeignKeyCount(Statement statement, String tableName) throws SQLException {
        return foreignKeyCount(statement, "conrelid", tableName);
    }

    private long inboundForeignKeyCount(Statement statement, String tableName) throws SQLException {
        return foreignKeyCount(statement, "confrelid", tableName);
    }

    private long foreignKeyCount(Statement statement, String relationColumn, String tableName) throws SQLException {
        try (ResultSet result = statement.executeQuery("""
                SELECT count(*) FROM pg_constraint
                WHERE contype = 'f' AND %s = '%s'::regclass
                """.formatted(relationColumn, tableName))) {
            assertThat(result.next()).isTrue();
            return result.getLong(1);
        }
    }

    private String uniqueConstraintColumns(Statement statement, String constraintName) throws SQLException {
        try (ResultSet result = statement.executeQuery("""
                SELECT string_agg(a.attname, ',' ORDER BY k.ord)
                FROM pg_constraint c
                JOIN unnest(c.conkey) WITH ORDINALITY AS k(attnum, ord) ON true
                JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = k.attnum
                WHERE c.conname = '%s' AND c.contype = 'u'
                """.formatted(constraintName))) {
            assertThat(result.next()).isTrue();
            return result.getString(1);
        }
    }

    private boolean indexExists(Statement statement, String indexName) throws SQLException {
        try (ResultSet result = statement.executeQuery("""
                SELECT EXISTS (SELECT 1 FROM pg_indexes
                WHERE schemaname = 'public' AND indexname = '%s')
                """.formatted(indexName))) {
            result.next();
            return result.getBoolean(1);
        }
    }

    private long generatedKey(Statement statement, String sql) throws SQLException {
        try (ResultSet result = statement.executeQuery(sql)) {
            assertThat(result.next()).isTrue();
            return result.getLong(1);
        }
    }
}
