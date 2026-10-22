package nuri.api.schema;

import nuri.business.service.cms.CmsDocumentValidator;
import nuri.business.service.file.AttachmentReferenceResolver;
import nuri.business.service.file.AttachmentSource;
import nuri.business.service.file.JdbcAttachmentReferenceResolver;
import org.flywaydb.core.api.MigrationVersion;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.SingleConnectionDataSource;

import java.sql.Connection;
import java.sql.SQLException;
import java.sql.Statement;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * V2_137 콘텐츠 페이지 표(ADR-0039)를 실 PostgreSQL 에서 본다 — 표준 메타 등록, 게시본의 추가 전용, 같은 페이지 안의 포인터,
 * 보관·문서 CHECK, 페이지 이미지의 일반 삭제 차단, 첨부 판정의 "현재 게시본만 공유".
 *
 * <p>[왜 별도 클래스인가] V2 체인의 이력 검증이다. 투영본은 V2 체인을 V1 번들로 바꾸므로 생성기가
 * {@code *MigrationIntegrationTest} 를 제거한다.
 */
@Tag("schema-validation")
@DisplayName("V2_137 콘텐츠 페이지 표")
class CmsContentMigrationIntegrationTest extends SharedPostgresMigrationTestSupport {

    private static final String DOC = "'{\"schemaVersion\":1,\"sections\":[]}'::jsonb";

    private void migrate() throws SQLException {
        AuthorizationCutoverTestSupport.migrate(flyway(MigrationVersion.fromVersion("2.137")));
    }

    private static long insertContent(Statement statement, String path) throws SQLException {
        try (var rows = statement.executeQuery("INSERT INTO tb_cms_conts (conts_path_nm, conts_ttl, conts_doc_cn, crt_dt, mdfcn_dt)"
                + " VALUES ('" + path + "', '제목', " + DOC + ", now(), now()) RETURNING conts_sn")) {
            rows.next();
            return rows.getLong(1);
        }
    }

    private static long insertRevision(Statement statement, long contsSn) throws SQLException {
        try (var rows = statement.executeQuery("INSERT INTO tb_cms_conts_rvsn (conts_sn, conts_ttl, conts_doc_cn, frst_rgtr_id, crt_dt)"
                + " VALUES (" + contsSn + ", '제목', " + DOC + ", 'editor', now()) RETURNING conts_rvsn_sn")) {
            rows.next();
            return rows.getLong(1);
        }
    }

    private static long insertImage(Statement statement) throws SQLException {
        long atchFileSn;
        try (var rows = statement.executeQuery("INSERT INTO tb_file_master (use_yn) VALUES ('Y') RETURNING atch_file_sn")) {
            rows.next();
            atchFileSn = rows.getLong(1);
        }
        statement.executeUpdate("INSERT INTO tb_file_detail (atch_file_sn, atch_file_seq, file_sz, strg_file_nm, orgnl_file_nm,"
                + " file_strg_path, file_estn) VALUES (" + atchFileSn + ", 1, 10, 'a.png', 'a.png', 'general/x', 'png')");
        return atchFileSn;
    }

    private static long insertContentFile(Statement statement, long contsSn, long atchFileSn) throws SQLException {
        try (var rows = statement.executeQuery("INSERT INTO tb_cms_conts_file (conts_sn, atch_file_sn, atch_file_seq, frst_rgtr_id, crt_dt)"
                + " VALUES (" + contsSn + ", " + atchFileSn + ", 1, 'editor', now()) RETURNING conts_file_sn")) {
            rows.next();
            return rows.getLong(1);
        }
    }

    private static long number(Statement statement, String sql) throws SQLException {
        try (var rows = statement.executeQuery(sql)) {
            rows.next();
            return rows.getLong(1);
        }
    }

    @Test
    @DisplayName("새 표준 용어 여섯·구조 문서 도메인을 등록하고 홈 소개 설정 행을 비워 둔다")
    void registersStandardsAndSeedsTheHomeSetting() throws Exception {
        migrate();
        try (var connection = openConnection(); var statement = connection.createStatement()) {
            assertThat(number(statement, "SELECT count(*) FROM meta_standard_terms WHERE eng_abbr IN ('CONTS_PATH_NM',"
                    + "'CONTS_DOC_CN','CONTS_RVSN_SN','CONTS_FILE_SN','SITE_STNG_SN','STNG_CD') AND deprecated_yn = 'N'")).isEqualTo(6);
            assertThat(number(statement, "SELECT count(*) FROM meta_standard_domains WHERE domain_name = '구조문서J'"
                    + " AND data_type = 'JSONB'")).isEqualTo(1);
            assertThat(number(statement, "SELECT count(*) FROM tb_cms_site_stng WHERE stng_cd = 'HOME_INTRO'"
                    + " AND conts_sn IS NULL AND version = 0")).isEqualTo(1);
            assertThat(number(statement, "SELECT count(*) FROM pg_trigger WHERE NOT tgisinternal AND tgname IN"
                    + " ('tr_tb_cms_conts_rvsn_chg_prhb', 'tr_tb_cms_conts_rvsn_file_chg_prhb')")).isEqualTo(2);
            assertThat(number(statement, "SELECT count(*) FROM tb_menu_info m JOIN tb_authrt_grnt_map g"
                    + " ON g.authrt_type_cd = 'NAVIGATION' AND g.authrt_grnt_cd = m.menu_sn::text AND g.authrt_cd = 'ROLE_ADMIN'"
                    + " WHERE m.up_menu_sn = 9030000 AND m.modern_route = '/admin/system/content-pages' AND m.use_yn = 'Y'"))
                    .as("관리 화면 메뉴와 관리자 메뉴 표시 배정").isEqualTo(1);
            assertThat(number(statement, "SELECT count(*) FROM tb_authrt_chg_hstry WHERE dmnd_idntfr = 'migration:2.137'"
                    + " AND chg_type_cd = 'ADD' AND authrt_type_cd = 'NAVIGATION' AND authrt_cd = 'ROLE_ADMIN'")).isEqualTo(1);
            // 기존 DB 에는 기본 시드가 돌지 않는다 — 관리자·시스템 그룹의 기능 권한 4종을 이 마이그레이션이 이력과 함께 넣는다.
            assertThat(number(statement, "SELECT count(*) FROM tb_authrt_grnt_map WHERE authrt_type_cd = 'OPERATION'"
                    + " AND authrt_cd IN ('ROLE_ADMIN', 'ROLE_SYSTEM')"
                    + " AND authrt_grnt_cd IN ('CMS_ADMIN_READ', 'CMS_UPDATE', 'CMS_PUBLISH', 'CMS_HOME_UPDATE')"))
                    .as("관리자·시스템 그룹의 CMS 기능 권한").isEqualTo(8);
            assertThat(number(statement, "SELECT count(*) FROM tb_authrt_grnt_map WHERE authrt_type_cd = 'OPERATION'"
                    + " AND authrt_cd NOT IN ('ROLE_ADMIN', 'ROLE_SYSTEM') AND authrt_grnt_cd LIKE 'CMS\\_%'")).isZero();
            assertThat(number(statement, "SELECT count(*) FROM tb_authrt_chg_hstry WHERE dmnd_idntfr = 'migration:2.137'"
                    + " AND chg_type_cd = 'ADD' AND authrt_type_cd = 'OPERATION'")).isEqualTo(8);
        }
    }

    @Test
    @DisplayName("게시본과 그 첨부 집합은 추가만 받고, 현재 게시 포인터는 같은 페이지의 게시본만 가리킨다")
    void revisionsAreAppendOnlyAndPointersStayWithinThePage() throws Exception {
        migrate();
        try (var connection = openConnection(); var statement = connection.createStatement()) {
            long first = insertContent(statement, "rvsn-first");
            long second = insertContent(statement, "rvsn-second");
            long revision = insertRevision(statement, first);
            long file = insertContentFile(statement, first, insertImage(statement));
            statement.executeUpdate("INSERT INTO tb_cms_conts_rvsn_file (conts_rvsn_sn, conts_file_sn, conts_sn, frst_rgtr_id, crt_dt)"
                    + " VALUES (" + revision + ", " + file + ", " + first + ", 'editor', now())");

            assertThatThrownBy(() -> statement.executeUpdate("UPDATE tb_cms_conts_rvsn SET conts_ttl = '바꿈' WHERE conts_rvsn_sn = " + revision))
                    .isInstanceOf(SQLException.class).hasMessageContaining("append-only");
            assertThatThrownBy(() -> statement.executeUpdate("DELETE FROM tb_cms_conts_rvsn WHERE conts_rvsn_sn = " + revision))
                    .isInstanceOf(SQLException.class).hasMessageContaining("append-only");
            assertThatThrownBy(() -> statement.executeUpdate("DELETE FROM tb_cms_conts_rvsn_file WHERE conts_rvsn_sn = " + revision))
                    .isInstanceOf(SQLException.class).hasMessageContaining("append-only");

            assertThatThrownBy(() -> statement.executeUpdate("UPDATE tb_cms_conts SET conts_rvsn_sn = " + revision
                    + " WHERE conts_sn = " + second))
                    .as("다른 페이지의 게시본을 가리키면 안 된다")
                    .isInstanceOf(SQLException.class).hasMessageContaining("fk_tb_cms_conts_tb_cms_conts_rvsn");
            assertThat(statement.executeUpdate("UPDATE tb_cms_conts SET conts_rvsn_sn = " + revision + " WHERE conts_sn = " + first))
                    .isEqualTo(1);
            assertThatThrownBy(() -> statement.executeUpdate("UPDATE tb_cms_conts SET kpng_yn = 'Y' WHERE conts_sn = " + first))
                    .as("게시 중인 페이지는 보관할 수 없다")
                    .isInstanceOf(SQLException.class).hasMessageContaining("ck_tb_cms_conts_kpng_unpublished");
            assertThatThrownBy(() -> insertContent(statement, "Upper-Case"))
                    .isInstanceOf(SQLException.class).hasMessageContaining("ck_tb_cms_conts_conts_path_nm");
            assertThatThrownBy(() -> statement.executeUpdate("UPDATE tb_cms_conts SET conts_doc_cn = '[]'::jsonb WHERE conts_sn = " + second))
                    .isInstanceOf(SQLException.class).hasMessageContaining("ck_tb_cms_conts_conts_doc_cn");
        }
    }

    @Test
    @DisplayName("페이지에 귀속된 이미지는 일반 파일 표에서 지울 수 없고, 한 첨부는 한 페이지에만 속한다")
    void pageImagesCannotBeDeletedThroughTheFileTables() throws Exception {
        migrate();
        try (var connection = openConnection(); var statement = connection.createStatement()) {
            long first = insertContent(statement, "file-first");
            long second = insertContent(statement, "file-second");
            long image = insertImage(statement);
            insertContentFile(statement, first, image);

            assertThatThrownBy(() -> statement.executeUpdate("DELETE FROM tb_file_detail WHERE atch_file_sn = " + image))
                    .isInstanceOf(SQLException.class).hasMessageContaining("fk_tb_cms_conts_file_tb_file_detail");
            assertThatThrownBy(() -> insertContentFile(statement, second, image))
                    .isInstanceOf(SQLException.class).hasMessageContaining("uk_tb_cms_conts_file_atch_file_sn");
        }
    }

    @Test
    @DisplayName("첨부 판정은 현재 게시본이 쓰는 이미지만 공유하고, 게시 중지·초안 이미지는 공유하지 않는다")
    void resolverSharesOnlyImagesOfTheCurrentRevision() throws Exception {
        migrate();
        try (Connection connection = openConnection(); var statement = connection.createStatement()) {
            SingleConnectionDataSource source = new SingleConnectionDataSource(connection, true);
            AttachmentReferenceResolver resolver = new JdbcAttachmentReferenceResolver(new JdbcTemplate(source),
                    List.of(() -> List.of(AttachmentSource.CMS_PAGE)));
            long page = insertContent(statement, "resolver-guide");
            long published = insertImage(statement);
            long draftOnly = insertImage(statement);
            long publishedFile = insertContentFile(statement, page, published);
            insertContentFile(statement, page, draftOnly);

            assertThat(resolver.resolve(published, "reader", "USR_READER").sharedGrant()).as("게시 전").isFalse();

            long revision = insertRevision(statement, page);
            statement.executeUpdate("INSERT INTO tb_cms_conts_rvsn_file (conts_rvsn_sn, conts_file_sn, conts_sn, frst_rgtr_id, crt_dt)"
                    + " VALUES (" + revision + ", " + publishedFile + ", " + page + ", 'editor', now())");
            statement.executeUpdate("UPDATE tb_cms_conts SET conts_rvsn_sn = " + revision + " WHERE conts_sn = " + page);

            AttachmentReferenceResolver.Grants publishedGrants = resolver.resolve(published, "reader", "USR_READER");
            assertThat(publishedGrants.sharedGrant()).as("게시본의 이미지").isTrue();
            assertThat(publishedGrants.ownerGrant()).isFalse();
            assertThat(publishedGrants.readDenied()).isFalse();
            assertThat(resolver.resolve(draftOnly, "reader", "USR_READER").sharedGrant()).as("초안에만 있는 이미지").isFalse();

            // 업로더가 일반 파일 API 로 같은 묶음에 덧붙인 파일은 이미지 검사를 거치지 않았다 — 묶음 전체가 공유를 잃는다.
            statement.executeUpdate("INSERT INTO tb_file_detail (atch_file_sn, atch_file_seq, file_sz, strg_file_nm, orgnl_file_nm,"
                    + " file_strg_path, file_estn) VALUES (" + published + ", 2, 10, 'b.txt', 'b.txt', 'general/x', 'txt')");
            assertThat(resolver.resolve(published, "reader", "USR_READER").sharedGrant()).as("덧붙인 파일이 있는 묶음").isFalse();
            statement.executeUpdate("DELETE FROM tb_file_detail WHERE atch_file_sn = " + published + " AND atch_file_seq = 2");
            assertThat(resolver.resolve(published, "reader", "USR_READER").sharedGrant()).as("덧붙인 파일을 지운 뒤").isTrue();

            statement.executeUpdate("UPDATE tb_cms_conts SET conts_rvsn_sn = NULL WHERE conts_sn = " + page);
            assertThat(resolver.resolve(published, "reader", "USR_READER").sharedGrant()).as("게시 중지 뒤").isFalse();
        }
    }

    @Test
    @DisplayName("검증기가 1 MiB 안으로 받은 경계 문서를 DB 가 받는다 — jsonb::text 는 구분자 뒤 공백만큼 더 길게 잰다")
    void acceptsBoundaryDocumentsTheValidatorAccepts() throws Exception {
        migrate();
        String json = boundaryDocument();
        try (Connection connection = openConnection(); var statement = connection.createStatement()) {
            String literal = "'" + json.replace("'", "''") + "'::jsonb";
            assertThat(number(statement, "SELECT octet_length((" + literal + ")::text)"))
                    .as("같은 문서를 jsonb::text 로 재면 1 MiB 를 넘는다 — DB 상한을 1 MiB 로 두면 이 문서를 거절한다")
                    .isGreaterThan(CmsDocumentValidator.MAX_BYTES);
            statement.executeUpdate("INSERT INTO tb_cms_conts (conts_path_nm, conts_ttl, conts_doc_cn, crt_dt, mdfcn_dt)"
                    + " VALUES ('boundary-document', '제목', " + literal + ", now(), now())");
            String oversized = "'{\"pad\":\"" + "a".repeat(2_097_152) + "\"}'::jsonb";
            assertThatThrownBy(() -> statement.executeUpdate("INSERT INTO tb_cms_conts (conts_path_nm, conts_ttl, conts_doc_cn,"
                    + " crt_dt, mdfcn_dt) VALUES ('oversized-document', '제목', " + oversized + ", now(), now())"))
                    .as("검증기를 우회한 큰 문서는 DB 안전망이 막는다")
                    .isInstanceOf(SQLException.class).hasMessageContaining("ck_tb_cms_conts_conts_doc_cn");
        }
    }

    /** 검증기가 정규화한 문서 가운데 압축 JSON 이 MAX_BYTES 바로 아래인 것. 문단이 많아 구분자가 많다. */
    private static String boundaryDocument() {
        CmsDocumentValidator validator = new CmsDocumentValidator();
        int paragraphs = 1_990;
        String json = validator.normalize(document(paragraphs, 0)).json();
        int room = CmsDocumentValidator.MAX_BYTES - json.getBytes(StandardCharsets.UTF_8).length;
        json = validator.normalize(document(paragraphs, room - 8)).json();
        assertThat(json.getBytes(StandardCharsets.UTF_8).length)
                .isBetween(CmsDocumentValidator.MAX_BYTES - 64, CmsDocumentValidator.MAX_BYTES);
        return json;
    }

    private static Map<String, Object> document(int paragraphs, int extra) {
        List<Object> content = new ArrayList<>();
        for (int index = 0; index < paragraphs; index++) {
            String body = "가".repeat(100) + (index == paragraphs - 1 ? "a".repeat(extra) : "");
            content.add(Map.of("type", "paragraph", "content", List.of(Map.of("type", "text", "text", body))));
        }
        Map<String, Object> section = Map.of("id", "a", "label", "", "layout", "one", "tone", "default", "spacing", "normal",
                "cells", List.of(Map.of("kind", "rich", "doc", Map.of("type", "doc", "content", content))));
        return Map.of("schemaVersion", 1, "sections", List.of(section));
    }
}
