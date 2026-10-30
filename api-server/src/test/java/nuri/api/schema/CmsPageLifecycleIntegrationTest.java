package nuri.api.schema;

import nuri.business.service.cms.CmsPageAdminService;
import nuri.business.service.cms.CmsPageReadService;
import nuri.business.service.cms.dto.CmsPageCreateRequest;
import nuri.business.service.cms.dto.CmsPageDetailDto;
import nuri.business.service.cms.dto.CmsPageDraftRequest;
import nuri.business.service.cms.dto.CmsPagePublishRequest;
import nuri.business.service.cms.dto.CmsPagePurgeRequest;
import nuri.business.service.cms.dto.CmsPageStateRequest;
import nuri.business.service.cms.dto.CmsPageSummaryDto;
import nuri.business.service.cms.dto.CmsRevisionPurgeRequest;
import nuri.business.service.cms.dto.CmsRevisionSummaryDto;
import nuri.foundation.core.exception.BusinessException;
import nuri.foundation.security.service.CustomUserDetails;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.data.domain.PageRequest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * 콘텐츠 페이지 수명주기를 실제 PostgreSQL 에서 서비스로 돌린다(ADR-0042). 단위 시험이 목으로 대신한 세 가지를 여기서 본다:
 * 목록 상태 조건의 jsonb 비교·LIKE 이스케이프, 미완성 칸을 받은 초안의 게시 차단, 그리고 게시본 불변 트리거의 파기 예외(V2_143)가
 * 같은 트랜잭션의 표시로만 열리고 수정은 계속 막는지.
 */
@Tag("schema-validation")
@SpringBootTest(properties = "nuri.durable-work.enabled=false")
@org.springframework.context.annotation.Import(AuthorizationSchemaRehearsalTestConfiguration.class)
@ActiveProfiles({"test", "tc"})
@DisplayName("콘텐츠 페이지 수명주기 — 초안 판정·상태 목록·삭제·파기(PostgreSQL)")
class CmsPageLifecycleIntegrationTest {

    private static final List<String> EDITOR_PERMISSIONS = List.of("CMS_ADMIN_READ", "CMS_UPDATE", "CMS_PUBLISH",
            "CMS_HOME_UPDATE", "CMS_PURGE", "FILE_UPLOAD");

    @Autowired private CmsPageAdminService adminService;
    @Autowired private CmsPageReadService readService;
    @Autowired private JdbcTemplate jdbc;
    @Autowired private PlatformTransactionManager transactionManager;
    @Autowired private javax.sql.DataSource dataSource;
    @Autowired private jakarta.persistence.EntityManager entityManager;

    private String suffix;
    private String login;
    private final List<Long> pages = new ArrayList<>();
    private final List<Long> attachments = new ArrayList<>();
    /** 시험이 만든 파일 상세 id. 파기·초안 정리가 파일을 지우면 이 id 로 실물 삭제 작업(FILE_DELETE)이 쌓인다. */
    private final List<String> fileDetails = new ArrayList<>();

    @BeforeEach
    void signIn() {
        suffix = UUID.randomUUID().toString().replace("-", "").substring(0, 10);
        login = "cms" + suffix;
        var principal = CustomUserDetails.builder().userId(login).esntlId("CMSE" + suffix).enabled(true)
                .permissions(EDITOR_PERMISSIONS).build();
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(principal, null, principal.getAuthorities()));
    }

    @AfterEach
    void cleanUp() {
        SecurityContextHolder.clearContext();
        new TransactionTemplate(transactionManager).executeWithoutResult(status -> {
            jdbc.queryForObject("SELECT set_config('nuri.cms_purge', 'on', true)", String.class);
            for (Long page : pages) {
                jdbc.update("UPDATE tb_cms_site_stng SET conts_sn = NULL WHERE conts_sn = ?", page);
                jdbc.update("UPDATE tb_cms_conts SET conts_rvsn_sn = NULL WHERE conts_sn = ?", page);
                jdbc.update("DELETE FROM tb_cms_conts_rvsn_file WHERE conts_sn = ?", page);
                jdbc.update("DELETE FROM tb_cms_conts_rvsn WHERE conts_sn = ?", page);
                jdbc.update("DELETE FROM tb_cms_conts_file WHERE conts_sn = ?", page);
                jdbc.update("DELETE FROM tb_cms_conts WHERE conts_sn = ?", page);
            }
            for (Long attachment : attachments) {
                jdbc.update("DELETE FROM tb_file_detail WHERE atch_file_sn = ?", attachment);
                jdbc.update("DELETE FROM tb_file_master WHERE atch_file_sn = ?", attachment);
            }
            // 남은 실물 삭제 작업을 지운다 — 같은 DB 를 쓰는 다른 시험의 dispatchOne() 이 가장 오래된 대기 작업으로 이것을 집어
            // 자기 작업을 처리하지 못한다(FileDeletionDurabilityIntegrationTest 가 이 시험 뒤에 돌면 실패했다).
            for (String fileDetail : fileDetails) {
                jdbc.update("DELETE FROM tb_sys_job WHERE job_se_nm = 'FILE_DELETE' AND job_mng_no = ?", fileDetail);
            }
        });
        AuditLedgerFixtures.delete(jdbc,
                "DELETE FROM tb_sys_adt_log WHERE job_nm IN ('CMS_PAGE_DELETE', 'CMS_PAGE_PURGE') AND adt_cn LIKE ?",
                "%" + suffix + "%");
    }

    private static Map<String, Object> document(Map<String, Object> cell) {
        return Map.of("schemaVersion", 1, "sections", List.of(Map.of("id", "a", "label", "", "layout", "one",
                "tone", "default", "spacing", "normal", "cells", List.of(cell))));
    }

    private static Map<String, Object> text(String value) {
        return Map.of("kind", "rich", "doc", Map.of("type", "doc", "content", List.of(
                Map.of("type", "paragraph", "content", List.of(Map.of("type", "text", "text", value))))));
    }

    private static Map<String, Object> image(long atchFileSn, String alt) {
        return Map.of("kind", "image", "atchFileSn", atchFileSn, "alt", alt, "decorative", false, "caption", "");
    }

    private long createPage(String path, Map<String, Object> document) {
        long page = adminService.createPage(CmsPageCreateRequest.builder().contsPathNm(path + "-" + suffix)
                .contsTtl("안내 " + path).document(document).build());
        pages.add(page);
        return page;
    }

    private CmsPageDetailDto save(long page, Map<String, Object> document) {
        CmsPageDetailDto current = adminService.getPage(page);
        return adminService.saveDraft(page, CmsPageDraftRequest.builder().contsPathNm(current.contsPathNm())
                .contsTtl(current.contsTtl()).document(document).version(current.version()).build());
    }

    private CmsPageDetailDto publish(long page) {
        return adminService.publish(page, CmsPagePublishRequest.builder().version(adminService.getPage(page).version()).build());
    }

    private long uploadedImage() {
        long atchFileSn = jdbc.queryForObject("INSERT INTO tb_file_master (use_yn, frst_rgtr_id) VALUES ('Y', ?)"
                + " RETURNING atch_file_sn", Long.class, login);
        fileDetails.add(jdbc.queryForObject("INSERT INTO tb_file_detail (atch_file_sn, atch_file_seq, file_sz, strg_file_nm,"
                + " orgnl_file_nm, file_strg_path, file_estn) VALUES (?, 1, 10, ?, 'a.png', 'general/cms-it', 'png')"
                + " RETURNING file_detail_id::text", String.class, atchFileSn, "cms-it-" + atchFileSn + ".png"));
        attachments.add(atchFileSn);
        return atchFileSn;
    }

    private List<String> listed(String status) {
        return adminService.getPages(suffix, status, PageRequest.of(0, 50)).getContent().stream()
                .map(CmsPageSummaryDto::contsPathNm).toList();
    }

    private long count(String sql, Object... args) {
        return jdbc.queryForObject(sql, Long.class, args);
    }

    @Test
    @DisplayName("목록 상태 — 초안·게시 중·게시 대기(jsonb 비교)·게시 중지를 가르고, 검색어의 % 를 글자 그대로 찾는다")
    void statusFiltersSeparateDraftsPendingAndUnpublishedPages() {
        long draft = createPage("draft", document(text("초안")));
        long changed = createPage("changed", document(text("게시본")));
        long unchanged = createPage("unchanged", document(text("그대로")));
        long stopped = createPage("stopped", document(text("내림")));
        publish(changed);
        publish(unchanged);
        publish(stopped);
        save(changed, document(text("고친 내용")));
        // 같은 문서를 키 순서만 바꿔 다시 저장해도 jsonb 는 같은 값이다 — 게시 대기로 보이면 안 된다.
        save(unchanged, Map.of("sections", List.of(Map.of("cells", List.of(text("그대로")), "spacing", "normal",
                "tone", "default", "layout", "one", "label", "", "id", "a")), "schemaVersion", 1));
        adminService.unpublish(stopped, CmsPageStateRequest.builder().version(adminService.getPage(stopped).version()).build());

        assertThat(listed("DRAFT")).containsExactly("draft-" + suffix);
        assertThat(listed("PENDING")).containsExactlyInAnyOrder("draft-" + suffix, "changed-" + suffix);
        assertThat(listed("UNPUBLISHED")).containsExactly("stopped-" + suffix);
        assertThat(listed("PUBLISHED")).containsExactlyInAnyOrder("changed-" + suffix, "unchanged-" + suffix);
        assertThat(adminService.getPage(stopped).status()).isEqualTo("UNPUBLISHED");
        assertThat(adminService.getPages("%", "ACTIVE", PageRequest.of(0, 50)).getContent())
                .as("% 는 와일드카드가 아니다").noneMatch(row -> row.contsPathNm().endsWith(suffix));
        assertThat(readService.getPublishedPages("안내 changed", PageRequest.of(0, 10)).getContent())
                .extracting(row -> row.contsPathNm()).contains("changed-" + suffix);
        assertThat(readService.getPublishedPages("안내 stopped", PageRequest.of(0, 10)).getContent())
                .as("게시를 멈춘 페이지는 안내 목록에 없다").noneMatch(row -> row.contsPathNm().endsWith(suffix));
        assertThat(draft).isPositive();
    }

    @Test
    @DisplayName("미완성 칸은 초안으로 저장되고 게시는 막히며, 초안에서 뺀 이미지는 귀속과 파일이 함께 정리된다")
    void draftsKeepUnfinishedCellsAndReleaseRemovedImages() {
        long kept = uploadedImage();
        long removed = uploadedImage();
        long page = createPage("gaps", Map.of("schemaVersion", 1, "sections", List.of(Map.of("id", "a", "label", "",
                "layout", "two", "tone", "default", "spacing", "normal",
                "cells", List.of(image(kept, "안내도"), image(removed, "약도"))))));
        assertThat(count("SELECT count(*) FROM tb_cms_conts_file WHERE conts_sn = ?", page)).isEqualTo(2);

        save(page, Map.of("schemaVersion", 1, "sections", List.of(Map.of("id", "a", "label", "", "layout", "two",
                "tone", "default", "spacing", "normal", "cells", List.of(image(kept, ""), image(0, ""))))));

        assertThat(count("SELECT count(*) FROM tb_cms_conts_file WHERE conts_sn = ? AND atch_file_sn = ?", page, removed))
                .as("초안에서 뺀 이미지의 귀속").isZero();
        assertThat(count("SELECT count(*) FROM tb_file_master WHERE atch_file_sn = ?", removed))
                .as("다른 참조가 없는 첨부는 파일까지 지운다").isZero();
        assertThat(count("SELECT count(*) FROM tb_file_master WHERE atch_file_sn = ?", kept)).isEqualTo(1);
        assertThatThrownBy(() -> publish(page))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("이미지 설명");
        assertThat(count("SELECT count(*) FROM tb_cms_conts_rvsn WHERE conts_sn = ?", page)).isZero();
    }

    @Test
    @DisplayName("한 번도 게시하지 않은 페이지는 지울 수 있고, 게시한 적이 있으면 지울 수 없다")
    void onlyNeverPublishedPagesCanBeDeleted() {
        long image = uploadedImage();
        long draft = createPage("delete-me", document(image(image, "그림")));
        long published = createPage("keep-me", document(text("본문")));
        publish(published);

        adminService.deleteDraftPage(draft, adminService.getPage(draft).version());

        assertThat(count("SELECT count(*) FROM tb_cms_conts WHERE conts_sn = ?", draft)).isZero();
        assertThat(count("SELECT count(*) FROM tb_file_master WHERE atch_file_sn = ?", image)).isZero();
        assertThatThrownBy(() -> adminService.deleteDraftPage(published, adminService.getPage(published).version()))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("게시한 적이 있는 페이지");
    }

    @Test
    @DisplayName("지난 게시본 파기는 그 게시본만 지우고 뒤 번호를 당기며, 처리 근거 번호를 감사에 남긴다")
    void purgingAnOldRevisionRemovesOnlyThatRevision() {
        long page = createPage("purge-revision", document(text("v1 개인정보")));
        publish(page);
        save(page, document(text("v2 고친 본")));
        publish(page);
        List<CmsRevisionSummaryDto> before = adminService.getRevisions(page);
        Long oldRevision = before.get(1).contsRvsnSn();
        Integer versionBefore = adminService.getPage(page).version();

        CmsPageDetailDto after = adminService.purgeRevision(page, oldRevision, CmsRevisionPurgeRequest.builder()
                .version(adminService.getPage(page).version()).caseReference("INC-" + suffix).build());

        assertThat(count("SELECT count(*) FROM tb_cms_conts_rvsn WHERE conts_rvsn_sn = ?", oldRevision)).isZero();
        assertThat(after.revisionCount()).isEqualTo(1);
        assertThat(after.publishedRevision().revisionNumber()).as("뒤 번호가 당겨진다").isEqualTo(1);
        assertThat(after.version()).as("열린 편집기가 409 로 다시 읽도록 버전이 오른다").isGreaterThan(versionBefore);
        assertThat(count("SELECT count(*) FROM tb_sys_adt_log WHERE job_nm = 'CMS_REVISION_PURGE'"
                + " AND adt_cn LIKE ?", "%reference=INC-" + suffix + "%")).isEqualTo(1);
        assertThatThrownBy(() -> adminService.purgeRevision(page, after.publishedRevision().contsRvsnSn(),
                CmsRevisionPurgeRequest.builder().version(adminService.getPage(page).version())
                        .caseReference("INC-" + suffix).build()))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("지금 사용자에게 보이는 게시본");
        adminService.unpublish(page, CmsPageStateRequest.builder().version(adminService.getPage(page).version()).build());
        assertThatThrownBy(() -> adminService.purgeRevision(page, after.publishedRevision().contsRvsnSn(),
                CmsRevisionPurgeRequest.builder().version(adminService.getPage(page).version())
                        .caseReference("INC-" + suffix).build()))
                .as("남은 마지막 게시본은 페이지 파기로만 지운다")
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("남은 게시본이 하나뿐");
        assertThat(adminService.getPage(page).status()).isEqualTo("UNPUBLISHED");
    }

    @Test
    @DisplayName("페이지 파기는 게시 중지 뒤에만 되고, 초안·게시본·첨부를 모두 지운다")
    void purgingAPageRemovesEverything() {
        long image = uploadedImage();
        long page = createPage("purge-page", document(image(image, "개인정보가 담긴 그림")));
        publish(page);
        CmsPagePurgeRequest purge = CmsPagePurgeRequest.builder().contsPathNm("purge-page-" + suffix)
                .caseReference("INC-" + suffix).build();

        purge.setVersion(adminService.getPage(page).version());
        assertThatThrownBy(() -> adminService.purgePage(page, purge))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("게시를 먼저 중지");

        adminService.unpublish(page, CmsPageStateRequest.builder().version(adminService.getPage(page).version()).build());
        purge.setVersion(adminService.getPage(page).version());
        adminService.purgePage(page, purge);

        assertThat(count("SELECT count(*) FROM tb_cms_conts WHERE conts_sn = ?", page)).isZero();
        assertThat(count("SELECT count(*) FROM tb_cms_conts_rvsn WHERE conts_sn = ?", page)).isZero();
        assertThat(count("SELECT count(*) FROM tb_cms_conts_file WHERE conts_sn = ?", page)).isZero();
        assertThat(count("SELECT count(*) FROM tb_file_master WHERE atch_file_sn = ?", image)).isZero();
        assertThat(count("SELECT count(*) FROM tb_sys_adt_log WHERE job_nm = 'CMS_PAGE_PURGE'"
                + " AND adt_cn LIKE ? AND adt_cn LIKE ?", "%reference=INC-" + suffix + "%", "%purge-page-" + suffix + "%"))
                .as("감사에 근거 번호와 지운 페이지의 주소가 남는다").isEqualTo(1);
    }

    @ParameterizedTest
    @CsvSource({"save,false", "save,true", "delete,false", "delete,true", "purge,false", "purge,true"})
    void actualReleasePathsWaitOnFileMasterAndKeepPageFileAndDurableIntentInOneTransaction(String operation, boolean rollback) throws Exception {
        long image = uploadedImage();
        long page = createPage("locked-release", document(image(image, "그림")));
        CmsPageDetailDto current = adminService.getPage(page);
        var beforePage = jdbc.queryForMap("SELECT * FROM tb_cms_conts WHERE conts_sn=?", page);
        var beforeReferences = jdbc.queryForList("SELECT * FROM tb_cms_conts_file WHERE conts_sn=?", page);
        String fileId = fileDetails.getFirst();
        var authentication = SecurityContextHolder.getContext().getAuthentication();
        String application = "cms-release-" + suffix;
        try (var blocker = dataSource.getConnection(); var executor = java.util.concurrent.Executors.newSingleThreadExecutor()) {
            blocker.setAutoCommit(false);
            int blockerPid;
            try (var statement = blocker.createStatement(); var row = statement.executeQuery("SELECT pg_backend_pid()")) {
                row.next(); blockerPid = row.getInt(1);
            }
            try (var lock = blocker.prepareStatement("SELECT atch_file_sn FROM tb_file_master WHERE atch_file_sn=? FOR UPDATE")) {
                lock.setLong(1, image); lock.executeQuery().close();
            }
            var releasing = executor.submit(() -> {
                SecurityContextHolder.getContext().setAuthentication(authentication);
                try {
                    new TransactionTemplate(transactionManager).executeWithoutResult(status -> {
                        jdbc.queryForObject("SELECT set_config('application_name', ?, true)", String.class, application);
                        switch (operation) {
                            case "save" -> adminService.saveDraft(page, CmsPageDraftRequest.builder()
                                    .contsPathNm(current.contsPathNm()).contsTtl(current.contsTtl())
                                    .document(document(text("첨부를 뺀 본문"))).version(current.version()).build());
                            case "delete" -> adminService.deleteDraftPage(page, current.version());
                            case "purge" -> adminService.purgePage(page, CmsPagePurgeRequest.builder()
                                    .contsPathNm(current.contsPathNm()).version(current.version()).caseReference("INC-" + suffix).build());
                            default -> throw new IllegalArgumentException(operation);
                        }
                        // saveDraft leaves the final FileMaster removal queued until flush/commit.
                        // JDBC observes database rows, so flush every operation before inspecting its uncommitted state.
                        entityManager.flush();
                        assertThat(count("SELECT count(*) FROM tb_file_master WHERE atch_file_sn=?", image)).isZero();
                        assertThat(count("SELECT count(*) FROM tb_sys_job WHERE job_se_nm='FILE_DELETE' AND job_mng_no=?", fileId)).isEqualTo(1);
                        if (rollback) status.setRollbackOnly();
                    });
                } finally { SecurityContextHolder.clearContext(); }
            });
            try {
                long deadline = System.nanoTime() + java.util.concurrent.TimeUnit.SECONDS.toNanos(15);
                boolean waiting;
                do {
                    waiting = Boolean.TRUE.equals(jdbc.queryForObject("SELECT EXISTS (SELECT 1 FROM pg_stat_activity "
                            + "WHERE datname=current_database() AND application_name=? AND wait_event_type='Lock' "
                            + "AND ? = ANY(pg_blocking_pids(pid)) AND lower(query) LIKE '%tb_file_master%')",
                            Boolean.class, application, blockerPid));
                    if (!waiting && releasing.isDone()) releasing.get();
                    if (!waiting) Thread.sleep(20);
                } while (!waiting && System.nanoTime() < deadline);
                assertThat(waiting).as("actual CMS %s release waits on the shared FileMaster lock", operation).isTrue();
                assertThat(count("SELECT count(*) FROM tb_file_detail WHERE atch_file_sn=?", image)).isEqualTo(1);
                assertThat(count("SELECT count(*) FROM tb_sys_job WHERE job_se_nm='FILE_DELETE' AND job_mng_no=?", fileId)).isZero();
            } finally { blocker.rollback(); }
            releasing.get(20, java.util.concurrent.TimeUnit.SECONDS);
        }
        assertThat(count("SELECT count(*) FROM tb_file_master WHERE atch_file_sn=?", image)).isEqualTo(rollback ? 1 : 0);
        assertThat(count("SELECT count(*) FROM tb_file_detail WHERE atch_file_sn=?", image)).isEqualTo(rollback ? 1 : 0);
        assertThat(count("SELECT count(*) FROM tb_sys_job WHERE job_se_nm='FILE_DELETE' AND job_mng_no=?", fileId)).isEqualTo(rollback ? 0 : 1);
        if (rollback) {
            assertThat(jdbc.queryForMap("SELECT * FROM tb_cms_conts WHERE conts_sn=?", page)).isEqualTo(beforePage);
            assertThat(jdbc.queryForList("SELECT * FROM tb_cms_conts_file WHERE conts_sn=?", page)).isEqualTo(beforeReferences);
            assertThat(count("SELECT count(*) FROM tb_sys_adt_log WHERE job_nm IN ('CMS_PAGE_DELETE','CMS_PAGE_PURGE') AND adt_cn LIKE ?",
                    "%locked-release-" + suffix + "%")).isZero();
        } else {
            assertThat(count("SELECT count(*) FROM tb_cms_conts_file WHERE conts_sn=?", page)).isZero();
            assertThat(count("SELECT count(*) FROM tb_cms_conts WHERE conts_sn=?", page)).isEqualTo(operation.equals("save") ? 1 : 0);
        }
    }

    @Test
    @DisplayName("V2_143 — 게시본 삭제는 그 트랜잭션의 파기 표시가 있을 때만 받고, 수정은 표시가 있어도 거부한다")
    void revisionGuardOpensOnlyForDeletionInsideAPurgeTransaction() {
        long page = createPage("guard", document(text("본문")));
        publish(page);
        adminService.unpublish(page, CmsPageStateRequest.builder().version(adminService.getPage(page).version()).build());
        TransactionTemplate transaction = new TransactionTemplate(transactionManager);

        assertThatThrownBy(() -> transaction.executeWithoutResult(status ->
                jdbc.update("DELETE FROM tb_cms_conts_rvsn WHERE conts_sn = ?", page)))
                .hasMessageContaining("append-only");
        assertThatThrownBy(() -> transaction.executeWithoutResult(status -> {
            jdbc.queryForObject("SELECT set_config('nuri.cms_purge', 'on', true)", String.class);
            jdbc.update("UPDATE tb_cms_conts_rvsn SET conts_ttl = '바꿈' WHERE conts_sn = ?", page);
        })).hasMessageContaining("append-only");
        // 표시는 트랜잭션이 끝나면 풀린다 — 앞 트랜잭션의 표시가 다음 트랜잭션으로 새지 않는다.
        assertThatThrownBy(() -> transaction.executeWithoutResult(status ->
                jdbc.update("DELETE FROM tb_cms_conts_rvsn WHERE conts_sn = ?", page)))
                .hasMessageContaining("append-only");
        transaction.executeWithoutResult(status -> {
            jdbc.queryForObject("SELECT set_config('nuri.cms_purge', 'on', true)", String.class);
            assertThat(jdbc.update("DELETE FROM tb_cms_conts_rvsn WHERE conts_sn = ?", page)).isEqualTo(1);
        });
    }
}
