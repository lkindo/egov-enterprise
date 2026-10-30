package nuri.api.harness;

import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import nuri.business.service.file.AttachmentSource;
import nuri.business.service.file.AttachmentSourceContributor;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.ClassPathScanningCandidateComponentProvider;
import org.springframework.core.annotation.AnnotationUtils;
import org.springframework.core.type.filter.AnnotationTypeFilter;
import org.springframework.core.type.filter.AssignableTypeFilter;

import java.io.IOException;
import java.lang.reflect.Field;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.Collection;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.TreeSet;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import static java.util.Map.entry;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.junit.jupiter.api.Assertions.fail;

/**
 * 🔒 첨부 참조원 레지스트리 정합 린터 — 기능별 {@link AttachmentSourceContributor}가
 * 실제 도메인을 따라가는지 고정한다. 클라이언트가 선택한 첨부를 새 업무 행에 연결하는 writer도
 * 소스에서 독립적으로 발견해, 원 업로더 확인이 물리·엔티티 저장보다 먼저 실행되는지 고정한다.
 *
 * <p>[왜 필요한가] 첨부 인가는 <b>도달성</b>으로 판정한다 — "이 첨부를 참조하는 업무 행을 읽을 수 있는가".
 * 그 판정의 전제는 contributor 집합이 <b>첨부를 참조하는 모든 도메인을 알고 있다</b>는 것이다.
 * 신규 도메인이 {@code atchFileSn} 를 갖는데 레지스트리에 없으면 그 도메인의 첨부는 아무 근거도 만들지
 * 못한다 — 즉 <b>정상 사용자가 자기 첨부에서 403</b> 을 맞는다(fail-closed 라 뚫리지는 않지만 조용히 망가진다).
 * 반대로 레지스트리에만 있고 엔티티가 사라진 항목은 死 SQL 이 되어 판정 비용만 남긴다.
 *
 * <p>[판정 축 2개]
 * <ol>
 *   <li><b>누락</b> — {@code atchFileSn} 필드를 가진 {@code @Entity} 의 테이블이 레지스트리에 없으면 위반.</li>
 *   <li><b>유령</b> — 레지스트리에 있는데 대응 엔티티가 없으면 위반.</li>
 * </ol>
 * 두 축 모두 동결 목록·예외 목록을 두지 않는다. 예외가 필요해지는 순간이 곧 판정이 흐려지는
 * 순간이므로, 현재 클래스패스의 contributor와 엔티티를 직접 대조한다(AGENTS.md Evidence guardrails H2).
 *
 * <p>Spring 컨텍스트를 띄우지 않는 순수 정적 테스트(클래스패스 스캔 + 리플렉션).
 */
@Tag("governance-harness")
class AttachmentSourceRegistryLinterTest {

    private static final Logger log = LoggerFactory.getLogger(AttachmentSourceRegistryLinterTest.class);

    private static final String ENTITY_SCAN_BASE = "nuri";
    private static final String ATTACHMENT_FIELD = "atchFileSn";

    private static final Pattern METHOD_DECLARATION = Pattern.compile(
            "(?m)^\\s*(?!(?:if|for|while|switch|catch|return|throw|else|do|try|new|record)\\b)"
                    + "(?:(?:public|protected|private)\\s+)?(?:(?:static|final|synchronized)\\s+)*"
                    + "[\\w.$][\\w.$<>?,\\[\\] ]*\\s+([a-zA-Z0-9_]+)\\s*\\(");
    private static final Pattern ATTACHMENT_USAGE = Pattern.compile(
            "\\.(?:getAtchFileSn|setAtchFileSn|atchFileSn|getFileUrl|fileUrl|uploadFiles|updateFiles|uploadBoardFiles|updateBoardFiles|assertAssignable)\\s*\\(");
    private static final Pattern LOCAL_ATTACHMENT_STORAGE_USAGE = Pattern.compile(
            "(?<![\\w$.])(?:createFileGroup|appendToFileGroup|storeFileDetails)\\s*\\(");
    private static final Set<String> UPLOAD_ENTRY_POINTS =
            Set.of("uploadFiles", "updateFiles", "uploadBoardFiles", "updateBoardFiles");
    private static final Pattern ATTACHMENT_IDENTIFIER = Pattern.compile("\\batchFileSn\\b");
    private static final Pattern ASSIGNMENT_MUTATION = Pattern.compile(
            "\\.(?:save|saveAll|saveAndFlush|persist|merge|update|updateAll|setAtchFileSn)\\s*\\(");

    /**
     * 첨부 저장소 자신. 참조원이 아니라 <b>참조 대상</b>이라 레지스트리에 들어가지 않는다.
     * (예외 목록이 아니라 대상 정의다 — 이 둘을 섞으면 예외 목록이 조용히 자란다.)
     */
    private static final Set<String> ATTACHMENT_STORAGE_TABLES =
            new TreeSet<>(Set.of("tb_file_master", "tb_file_detail"));

    /**
     * 실제 소스에서 발견되는 첨부 소비 메서드의 exact census.
     *
     * <p>인가 토큰이 빈 규칙은 응답 변환·점검 같은 read-only 소비다. 쓰기 규칙은 인가 토큰이 존재하고,
     * 모든 저장·변경 토큰보다 먼저 실행돼야 한다. read-only 규칙은 저장·삭제·변경 토큰을 금지한다.
     * 신규 소비 메서드는 자동 수집되므로 이 목록에서 read/write 의미를 판정하지 않으면 red다.
     * 업로드 진입점은 지정한 단일 helper 호출만 허용하며, 그 helper도 독립 수집해 실제 가드를 검사한다.
     */
    private static final Map<String, AttachmentMethodRule> ATTACHMENT_METHOD_RULES = Map.ofEntries(
            entry("business-app/src/main/java/nuri/business/service/cms/CmsContentFileService.java#claim",
                    guarded("attachmentAssignmentPolicy.assertAssignable(atchFileSn)", "contentFileRepository.save(")),
            // [ADR-0042] 귀속 해제 — 페이지 귀속 행만 지우고 파일 삭제는 파일 서비스의 '남은 참조 없음' 판정에 맡긴다.
            //   파일 표를 직접 지우지 않는다. 미사용 해제는 그 해제 하나에만 위임한다.
            entry("business-app/src/main/java/nuri/business/service/cms/CmsContentFileService.java#release",
                    delegate("fileService.discardUnreferencedAttachment(", "fileDetailRepository.", "fileMasterRepository.")),
            entry("business-app/src/main/java/nuri/business/service/cms/CmsContentFileService.java#releaseUnused",
                    delegate("release(unused)", "contentFileRepository.delete", "fileService.")),
            entry("business-core/src/main/java/nuri/business/service/deptjob/DeptJobService.java#createDeptJob",
                    guarded("assertAttachmentIsAssignable(dto.getAtchFileSn())", "deptJobRepository.save(")),
            entry("business-core/src/main/java/nuri/business/service/deptjob/DeptJobService.java#updateDeptJob",
                    guarded("assertAttachmentIsAssignable(dto.getAtchFileSn())", "deptJob.update(")),
            entry("business-core/src/main/java/nuri/business/service/deptjob/DeptJobService.java#assertAttachmentIsAssignable",
                    required("attachmentAssignmentPolicy.assertAssignable(atchFileSn)")),
            // 저장 요청의 DTO 변환은 파일 귀속을 저장하지 않는다. 실제 writer 가드는 서비스에서 유지한다.
            entry("business-core/src/main/java/nuri/business/service/deptjob/dto/DeptJobSaveRequest.java#toDto",
                    readOnly()),
            entry("business-app/src/main/java/nuri/business/service/promotion/popup/dto/PopupSaveRequest.java#toDto",
                    readOnly()),
            entry("business-core/src/main/java/nuri/business/service/file/AttachmentIntegrityService.java#knownNamesByDirectory",
                    readOnly()),
            entry("business-core/src/main/java/nuri/business/service/file/AttachmentIntegrityService.java#describe",
                    readOnly()),
            entry("business-core/src/main/java/nuri/business/service/file/FileAccessPolicy.java#assertReadable",
                    readOnly()),
            entry("business-core/src/main/java/nuri/business/service/file/FileAccessPolicy.java#assertAttachable",
                    readOnly()),
            entry("business-core/src/main/java/nuri/business/service/file/FileAccessPolicy.java#assertDeletable",
                    readOnly()),
            entry("business-core/src/main/java/nuri/business/service/file/FileService.java#uploadFiles",
                    uploadDelegate("return createFileGroup(files, UploadProfile.GENERAL)")),
            entry("business-core/src/main/java/nuri/business/service/file/FileService.java#uploadBoardFiles",
                    uploadDelegate("return createFileGroup(files, UploadProfile.BOARD)")),
            entry("business-core/src/main/java/nuri/business/service/file/FileService.java#createFileGroup",
                    generatedUpload()),
            entry("business-core/src/main/java/nuri/business/service/file/FileService.java#updateFiles",
                    uploadDelegate("appendToFileGroup(atchFileSn, files, UploadProfile.GENERAL)")),
            entry("business-core/src/main/java/nuri/business/service/file/FileService.java#updateBoardFiles",
                    uploadDelegate("appendToFileGroup(atchFileSn, files, UploadProfile.BOARD)")),
            entry("business-core/src/main/java/nuri/business/service/file/FileService.java#appendToFileGroup",
                    guarded("accessPolicy.assertAttachable(master)",
                            "fileDetailRepository.findByFileMaster(", "storeFileDetails(")),
            entry("business-core/src/main/java/nuri/business/service/file/FileService.java#convertToDto",
                    readOnly()),
            // 부모 잠금 뒤 최신 detail을 읽는 삭제 경로도 인가가 메타·실물 삭제보다 먼저여야 한다.
            entry("business-core/src/main/java/nuri/business/service/file/FileService.java#deleteFile",
                    guarded("accessPolicy.assertDeletable(master)",
                            "fileDetailRepository.delete(", "scheduleStoredFileDeletion(")),
            // 불변 스냅샷·응답 변환은 저장소를 변경하지 않는다(중첩 record도 소비 census에 포함된다).
            entry("business-core/src/main/java/nuri/business/service/file/dto/FileReadSnapshot.java#FileReadSnapshot",
                    readOnly()),
            entry("business-core/src/main/java/nuri/business/service/file/dto/FileReadSnapshot.java#Entry",
                    readOnly()),
            entry("business-core/src/main/java/nuri/business/service/file/dto/FileReadSnapshot.java#from",
                    readOnly()),
            entry("business-core/src/main/java/nuri/business/service/file/dto/FileReadSnapshot.java#toDto",
                    readOnly()),
            entry("business-app/src/main/java/nuri/business/service/board/BoardService.java#createPost",
                    guarded("attachmentAssignmentPolicy.assertAssignable(request.atchFileSn())",
                            "boardRepository.save(")),
            entry("business-app/src/main/java/nuri/business/service/board/BoardService.java#createPostWithFiles",
                    delegate("createPost(userId, newRequest)", "boardRepository.save(", "board.update(")),
            entry("business-app/src/main/java/nuri/business/service/board/BoardService.java#replyPost",
                    guarded("attachmentAssignmentPolicy.assertAssignable(request.atchFileSn())",
                            "boardRepository.save(")),
            entry("business-app/src/main/java/nuri/business/service/board/BoardService.java#replyPostWithFiles",
                    delegate("replyPost(userId, parentSn, newRequest)", "boardRepository.save(", "board.update(")),
            entry("business-app/src/main/java/nuri/business/service/board/BoardService.java#updateOwnedPost",
                    guarded("attachmentAssignmentPolicy.assertAssignable(request.atchFileSn())", "board.update(")),
            entry("business-app/src/main/java/nuri/business/service/board/BoardService.java#updatePostWithFiles",
                    guarded("attachmentAssignmentPolicy.assertAssignable(atchFileSn)",
                            "fileService.updateBoardFiles(", "updateOwnedPost(")),
            // [2026-09-25 DIP D8] 메일은 첨부를 발송하지 않으므로 할당하지 않는다 — 지정하면 거부만 한다.
            entry("business-app/src/main/java/nuri/business/service/mail/MailService.java#assertNoAttachment",
                    readOnly()),
            entry("business-app/src/main/java/nuri/business/service/mail/dto/SentMailDto.java#from",
                    readOnly()),
            entry("business-app/src/main/java/nuri/business/service/memoreport/MemoReportService.java#createMemoReport",
                    guarded("attachmentAssignmentPolicy.assertAssignable(atchFileSn)",
                            "memoReportRepository.save(")),
            entry("business-app/src/main/java/nuri/business/service/memoreport/MemoReportService.java#updateMemoReport",
                    guarded("attachmentAssignmentPolicy.assertAssignable(atchFileSn)", "entity.update(")),
            // 조회 권한·내용 지문은 첨부의 read-only 소비다. 개인 첨부 인가는 FileService가 집행한다.
            entry("business-app/src/main/java/nuri/business/service/memoreport/MemoReportService.java#canReadAttachments",
                    readOnly()),
            entry("business-app/src/main/java/nuri/business/service/memoreport/MemoReportService.java#readAttachments",
                    readOnly()),
            entry("business-app/src/main/java/nuri/business/service/memoreport/MemoReportService.java#instructionReadToken",
                    readOnly()),
            entry("business-app/src/main/java/nuri/business/service/note/NoteService.java#sendNote",
                    guarded("attachmentAssignmentPolicy.assertAssignable(atchFileSn)",
                            "noteRepository.save(")),
            entry("business-app/src/main/java/nuri/business/service/note/NoteService.java#convertTrnsmitToDto",
                    readOnly()),
            entry("business-app/src/main/java/nuri/business/service/note/NoteService.java#convertRecptnToDto",
                    readOnly()),
            entry("business-app/src/main/java/nuri/business/service/reward/RewardManageService.java#createReward",
                    guarded("attachmentAssignmentPolicy.assertAssignable(atchFileSn)",
                            "rewardManageRepository.save(")),
            entry("business-app/src/main/java/nuri/business/service/reward/RewardManageService.java#updateReward",
                    guarded("attachmentAssignmentPolicy.assertAssignable(atchFileSn)", "reward.update(")),
            entry("business-app/src/main/java/nuri/business/service/reward/RewardManageService.java#convertToDto",
                    readOnly()),
            entry("business-app/src/main/java/nuri/business/service/report/WorkReportService.java#createWorkReport",
                    guarded("attachmentAssignmentPolicy.assertAssignable(atchFileSn)",
                            "workReportRepository.save(")),
            entry("business-app/src/main/java/nuri/business/service/report/WorkReportService.java#updateWorkReport",
                    guarded("attachmentAssignmentPolicy.assertAssignable(atchFileSn)", "entity.update(")),
            entry("business-app/src/main/java/nuri/business/service/report/WorkReportService.java#toDto",
                    readOnly()),
            entry("business-app/src/main/java/nuri/business/service/schedule/ScheduleService.java#createSchedule",
                    guarded("attachmentAssignmentPolicy.assertAssignable(atchFileSn)",
                            "scheduleRepository.save(")),
            entry("business-app/src/main/java/nuri/business/service/schedule/ScheduleService.java#updateSchedule",
                    guarded("attachmentAssignmentPolicy.assertAssignable(atchFileSn)", "entity.updateAll(")),
            entry("business-app/src/main/java/nuri/business/service/promotion/banner/BannerService.java#insertBanner",
                    guarded("attachmentAssignmentPolicy.assertAssignable(atchFileSn)",
                            "bannerRepository.save(")),
            entry("business-app/src/main/java/nuri/business/service/promotion/banner/BannerService.java#updateBanner",
                    guarded("attachmentAssignmentPolicy.assertAssignable(atchFileSn)", "entity.update(")),
            entry("business-app/src/main/java/nuri/business/service/promotion/popup/PopupService.java#createPopup",
                    guarded("attachmentAssignmentPolicy.assertAssignable(atchFileSn)",
                            "popupRepository.save(")),
            entry("business-app/src/main/java/nuri/business/service/promotion/popup/PopupService.java#updatePopup",
                    guarded("attachmentAssignmentPolicy.assertAssignable(requestedAtchFileSn)", "popup.update(")),
            entry("business-app/src/main/java/nuri/business/service/promotion/popup/dto/PopupDto.java#from",
                    readOnly()));

    @Test
    @DisplayName("🔒 첨부를 참조하는 모든 엔티티가 AttachmentSource 에 등록돼 있다 — 도달성 인가의 전제")
    void auditAttachmentSourceRegistryCoversEveryReferencingEntity() {
        Map<String, String> tableToEntity = scanEntitiesHoldingAttachmentSn();

        // 게이트 무결성(false-green 방지): 스캔이 조용히 0 에 수렴하면 vacuous 통과가 된다.
        if (tableToEntity.isEmpty()) {
            fail("게이트 무결성 파손: atchFileSn 보유 엔티티 스캔 건수(" + tableToEntity.size()
                    + ")가 0이다 — 스캔/클래스패스 파손 의심.");
        }

        Collection<AttachmentSource> activeSources = scanContributedSources();
        Set<String> registered = new TreeSet<>(activeSources.stream().map(AttachmentSource::table).toList());
        if (registered.size() != activeSources.size()) {
            fail("첨부 참조원 contributor가 같은 table을 중복 등록했다: " + activeSources);
        }
        List<String> missing = new ArrayList<>();
        tableToEntity.forEach((table, entity) -> {
            if (!registered.contains(table)) {
                missing.add(table + " (" + entity + ")");
            }
        });

        // 유령 판정은 **연결 방식별로** 다르다. 전용 컬럼(atch_file_sn)으로 잇는 참조원은 위 스캔에
        // 잡혀야 하고, URL 문자열로 잇는 참조원(POPUP)은 그 스캔 대상이 아니므로 물리 테이블의
        // 실존으로 판정한다. 이 구분이 없으면 URL 연결 참조원을 등록하는 순간 게이트가 거짓 red 가 된다.
        Set<String> allEntityTables = scanAllEntityTables();
        List<String> phantom = new ArrayList<>();
        for (AttachmentSource source : activeSources) {
            String table = source.table();
            boolean present = source.linksByAttachmentSnColumn()
                    ? tableToEntity.containsKey(table)
                    : allEntityTables.contains(table);
            if (!present) {
                phantom.add(table + (source.linksByAttachmentSnColumn() ? "" : " (URL 연결)"));
            }
        }

        if (!missing.isEmpty() || !phantom.isEmpty()) {
            StringBuilder sb = new StringBuilder();
            sb.append("\n========================================================================\n");
            sb.append("🔒 [ATTACHMENT SOURCE REGISTRY] 첨부 참조원 레지스트리가 도메인과 어긋났습니다!\n");
            sb.append("========================================================================\n");
            for (String m : missing) {
                sb.append("❌ [누락] ").append(m)
                        .append(" — atchFileSn 를 갖지만 AttachmentSource 에 없음\n");
            }
            for (String p : phantom) {
                sb.append("❌ [유령] ").append(p)
                        .append(" — AttachmentSource 에 있으나 대응 @Entity 없음\n");
            }
            sb.append("\n💡 첨부 인가는 '참조 행을 읽을 수 있는가' 로 판정한다(FileAccessPolicy).\n");
            sb.append("   누락된 도메인의 첨부는 어떤 근거도 만들지 못해 정상 사용자가 403 을 맞는다.\n");
            sb.append("   AttachmentSource 에 추가할 때는 민감도(SHARED/PERSONAL/DERIVED)와\n");
            sb.append("   소유 축(frst_rgtr_id=loginId / user_id 계열=esntlId)을 **실측**한 뒤 정한다.\n");
            fail(sb.toString());
        }

        log.info("✅ 첨부 참조원 레지스트리 정합 — 엔티티 {}종 ↔ 등록 {}종 일치.",
                tableToEntity.size(), registered.size());
    }

    @Test
    @DisplayName("🔒 첨부 할당 writer는 exact census에 등록되고 원 업로더 가드를 저장보다 먼저 실행한다")
    void auditAttachmentAssignmentWriters() throws IOException {
        List<String> violations = attachmentMethodViolations(
                loadAttachmentServiceSources(), activeAttachmentRules());
        if (!violations.isEmpty()) {
            fail("첨부 할당 writer 계약 위반:\n - " + String.join("\n - ", violations));
        }
    }

    @Test
    @DisplayName("🔒 읽은 첨부 정책의 실제 소비 규칙은 삭제 가드 후행·누락과 DTO 저장을 거부한다")
    void readSnapshotConsumersRejectWritesAndUnguardedDeletion() throws IOException {
        Map<String, String> sources = loadAttachmentServiceSources();
        Map<String, AttachmentMethodRule> rules = activeAttachmentRules();
        String filePath = "business-core/src/main/java/nuri/business/service/file/FileService.java";
        if (sources.containsKey(filePath)) {
            String original = sources.get(filePath);
            String guard = "accessPolicy.assertDeletable(master);";
            String schedule = "scheduleStoredFileDeletion(detail);";
            assertTrue(original.contains(guard));
            assertTrue(original.contains(schedule));
            for (Map.Entry<String, String> mutation : Map.of(
                    "가드 토큰 소실", original.replace(guard, ""),
                    "저장보다 뒤", original.replace(guard, "").replace(schedule, schedule + " " + guard)).entrySet()) {
                Map<String, String> mutated = new LinkedHashMap<>(sources);
                mutated.put(filePath, mutation.getValue());
                assertTrue(attachmentMethodViolations(mutated, rules).stream().anyMatch(value ->
                        value.contains(filePath + "#deleteFile") && value.contains(mutation.getKey())));
            }
        }
        for (String dtoPath : List.of(
                "business-core/src/main/java/nuri/business/service/deptjob/dto/DeptJobSaveRequest.java",
                "business-app/src/main/java/nuri/business/service/promotion/popup/dto/PopupSaveRequest.java")) {
            if (!sources.containsKey(dtoPath)) continue; // 선택 기능이 없는 생성물에는 DTO도 없다.
            String original = sources.get(dtoPath);
            assertTrue(original.contains("toDto() {"));
            Map<String, String> mutated = new LinkedHashMap<>(sources);
            mutated.put(dtoPath, original.replace("toDto() {", "toDto() { repository.save(entity);"));
            assertTrue(attachmentMethodViolations(mutated, rules).stream().anyMatch(value ->
                    value.contains(dtoPath + "#toDto") && value.contains("금지된 쓰기/재사용 토큰")));
        }
    }

    private static Map<String, AttachmentMethodRule> activeAttachmentRules() {
        Map<String, AttachmentMethodRule> active = new LinkedHashMap<>();
        ATTACHMENT_METHOD_RULES.forEach((key, rule) -> {
            if (ReusableHarnessProfile.current().retainsSource(key)) active.put(key, rule);
        });
        return active;
    }

    @Test
    @DisplayName("🔒 writer 게이트는 미등록·잘못된 ID·다중 저장 순서·read-only 쓰기를 red로 검출한다")
    void attachmentWriterGateRejectsSyntheticRegressions() {
        String path = "business-app/src/main/java/example/SyntheticService.java";
        String key = path + "#create";
        Map<String, AttachmentMethodRule> rules = Map.of(
                key, guarded("assignmentPolicy.assertAssignable(dto.getAtchFileSn())",
                        "repository.save(", "storage.write("));
        String good = """
                class SyntheticService {
                    public void create(Input dto) {
                        if (dto.getAtchFileSn() == null) {
                            return;
                        }
                        assignmentPolicy.assertAssignable(dto.getAtchFileSn());
                        repository.save(Item.builder().atchFileSn(dto.getAtchFileSn()).build());
                        storage.write(dto.getAtchFileSn());
                    }
                }
                """;
        assertTrue(attachmentMethodViolations(Map.of(path, good), rules).isEmpty());

        String missingGuard = """
                class SyntheticService {
                    public void create(Input dto) {
                        repository.save(Item.builder().atchFileSn(dto.getAtchFileSn()).build());
                        storage.write(dto.getAtchFileSn());
                    }
                }
                """;
        assertTrue(attachmentMethodViolations(Map.of(path, missingGuard), rules).stream()
                .anyMatch(value -> value.contains("가드 토큰 소실")));

        String lateGuard = """
                class SyntheticService {
                    public void create(Input dto) {
                        repository.save(Item.builder().atchFileSn(dto.getAtchFileSn()).build());
                        assignmentPolicy.assertAssignable(dto.getAtchFileSn());
                        storage.write(dto.getAtchFileSn());
                    }
                }
                """;
        assertTrue(attachmentMethodViolations(Map.of(path, lateGuard), rules).stream()
                .anyMatch(value -> value.contains("저장보다 뒤")));

        String wrongId = good.replace(
                "assignmentPolicy.assertAssignable(dto.getAtchFileSn())",
                "assignmentPolicy.assertAssignable(otherAtchFileSn)");
        assertTrue(attachmentMethodViolations(Map.of(path, wrongId), rules).stream()
                .anyMatch(value -> value.contains("가드 토큰 소실")));

        String secondMutationBeforeGuard = good.replace(
                "assignmentPolicy.assertAssignable(dto.getAtchFileSn());",
                "storage.write(dto.getAtchFileSn());\n"
                        + "            assignmentPolicy.assertAssignable(dto.getAtchFileSn());")
                .replace("storage.write(dto.getAtchFileSn());\n    }", "repository.flush();\n    }");
        assertTrue(attachmentMethodViolations(Map.of(path, secondMutationBeforeGuard), rules).stream()
                .anyMatch(value -> value.contains("storage.write(") && value.contains("저장보다 뒤")));

        Map<String, AttachmentMethodRule> readOnlyRules = Map.of(
                path + "#view", readOnly());
        String readOnlyWrite = """
                class SyntheticService {
                    public Item view(Item item) {
                        repository.save(item);
                        return item.getAtchFileSn();
                    }
                }
                """;
        assertTrue(attachmentMethodViolations(Map.of(path, readOnlyWrite), readOnlyRules).stream()
                .anyMatch(value -> value.contains("금지된 쓰기/재사용 토큰")));

        String readOnlyBulkWrite = readOnlyWrite.replace(
                "repository.save(item);", "repository.saveAll(items);\n        item.setAtchFileSn(99L);");
        assertTrue(attachmentMethodViolations(Map.of(path, readOnlyBulkWrite), readOnlyRules).stream()
                .filter(value -> value.contains("금지된 쓰기/재사용 토큰"))
                .count() >= 2);

        String uploadPath = "business-core/src/main/java/example/FileService.java";
        Map<String, AttachmentMethodRule> uploadRules = Map.of(
                uploadPath + "#uploadFiles", generatedUpload());
        String generatedUpload = """
                class FileService {
                    public Long uploadFiles(Files files) {
                        FileMaster master = fileMasterRepository.save(FileMaster.create());
                        storeFileDetails(master, files);
                        return master.getAtchFileSn();
                    }
                }
                """;
        assertTrue(attachmentMethodViolations(Map.of(uploadPath, generatedUpload), uploadRules).isEmpty());
        String reusedUpload = generatedUpload.replace(
                "fileMasterRepository.save(FileMaster.create())",
                "fileMasterRepository.findById(atchFileSn).orElseThrow() ");
        assertTrue(attachmentMethodViolations(Map.of(uploadPath, reusedUpload), uploadRules).stream()
                .anyMatch(value -> value.contains("가드 토큰 소실")
                        || value.contains("금지된 쓰기/재사용 토큰")));
        String storedBeforeCreate = """
                class FileService {
                    public Long uploadFiles(Files files) {
                        storeFileDetails(FileMaster.create(), files);
                        FileMaster master = fileMasterRepository.save(FileMaster.create());
                        return master.getAtchFileSn();
                    }
                }
                """;
        assertTrue(attachmentMethodViolations(Map.of(uploadPath, storedBeforeCreate), uploadRules).stream()
                .anyMatch(value -> value.contains("저장보다 뒤")));

        String delegatePath = "business-app/src/main/java/example/DelegatingService.java";
        Map<String, AttachmentMethodRule> delegateRules = Map.of(
                delegatePath + "#createWithFiles",
                delegate("create(userId, request)", "repository.save("));
        String unsafeDelegate = """
                class DelegatingService {
                    public void createWithFiles(Request request) {
                        repository.save(request.atchFileSn());
                        create(userId, request);
                    }
                }
                """;
        assertTrue(attachmentMethodViolations(Map.of(delegatePath, unsafeDelegate), delegateRules).stream()
                .anyMatch(value -> value.contains("금지된 쓰기/재사용 토큰")));

        String unregistered = good.replace("void create", "void createNew");
        assertTrue(attachmentMethodViolations(Map.of(path, unregistered), rules).stream()
                .anyMatch(value -> value.contains("미등록 소비 메서드")));

        String packagePrivate = good.replace("public void create", "void createNew");
        assertTrue(attachmentMethodViolations(Map.of(path, packagePrivate), rules).stream()
                .anyMatch(value -> value.contains("미등록 소비 메서드") && value.contains("createNew")));

        String constructorWriter = """
                class SyntheticService {
                    void createByConstructor(Long atchFileSn) {
                        repository.save(new Item(atchFileSn));
                    }
                }
                """;
        assertTrue(attachmentMethodViolations(Map.of(path, constructorWriter), Map.of()).stream()
                .anyMatch(value -> value.contains("미등록 소비 메서드")
                        && value.contains("createByConstructor")));
    }

    @Test
    @DisplayName("🔒 일반·게시판 업로드의 단일 위임과 실제 helper 인가를 함께 검사한다")
    void fileUploadDelegationGateRejectsBypassedOrUnguardedHelpers() {
        String path = "business-core/src/main/java/example/FileService.java";
        Map<String, AttachmentMethodRule> rules = Map.ofEntries(
                entry(path + "#uploadFiles", uploadDelegate("return createFileGroup(files, UploadProfile.GENERAL)")),
                entry(path + "#uploadBoardFiles", uploadDelegate("return createFileGroup(files, UploadProfile.BOARD)")),
                entry(path + "#createFileGroup", generatedUpload()),
                entry(path + "#updateFiles", uploadDelegate("appendToFileGroup(atchFileSn, files, UploadProfile.GENERAL)")),
                entry(path + "#updateBoardFiles", uploadDelegate("appendToFileGroup(atchFileSn, files, UploadProfile.BOARD)")),
                entry(path + "#appendToFileGroup", guarded("accessPolicy.assertAttachable(master)",
                        "fileDetailRepository.findByFileMaster(", "storeFileDetails(")));
        String good = """
                class FileService {
                    public Long uploadFiles(Files files) {
                        return createFileGroup(files, UploadProfile.GENERAL);
                    }
                    public Long uploadBoardFiles(Files files) {
                        return createFileGroup(files, UploadProfile.BOARD);
                    }
                    private Long createFileGroup(Files files, UploadProfile profile) {
                        FileMaster master = fileMasterRepository.save(FileMaster.create());
                        storeFileDetails(master, files, 1);
                        return master.getAtchFileSn();
                    }
                    public void updateFiles(Long atchFileSn, Files files) {
                        appendToFileGroup(atchFileSn, files, UploadProfile.GENERAL);
                    }
                    public void updateBoardFiles(Long atchFileSn, Files files) {
                        appendToFileGroup(atchFileSn, files, UploadProfile.BOARD);
                    }
                    private void appendToFileGroup(Long atchFileSn, Files files, UploadProfile profile) {
                        FileMaster master = fileMasterRepository.findById(atchFileSn).orElseThrow();
                        accessPolicy.assertAttachable(master);
                        fileDetailRepository.findByFileMaster(master);
                        storeFileDetails(master, files, maxSn + 1);
                    }
                }
                """;
        assertTrue(attachmentMethodViolations(Map.of(path, good), rules).isEmpty());

        String missingGuard = good.replace("accessPolicy.assertAttachable(master);",
                "// accessPolicy.assertAttachable(master);");
        assertTrue(attachmentMethodViolations(Map.of(path, missingGuard), rules).stream()
                .anyMatch(value -> value.contains("#appendToFileGroup") && value.contains("가드 토큰 소실")));

        String lateGuard = good.replace("accessPolicy.assertAttachable(master);", "")
                .replace("storeFileDetails(master, files, maxSn + 1);",
                        "storeFileDetails(master, files, maxSn + 1); accessPolicy.assertAttachable(master);");
        assertTrue(attachmentMethodViolations(Map.of(path, lateGuard), rules).stream()
                .anyMatch(value -> value.contains("#appendToFileGroup") && value.contains("저장보다 뒤")));

        String boardUpdate = "appendToFileGroup(atchFileSn, files, UploadProfile.BOARD);";
        for (String unsafeCall : List.of(
                "storeFileDetails(uncheckedMaster, files, 1);",
                "appendToFileGroup(otherAtchFileSn, files, UploadProfile.BOARD);",
                "appendToFileGroup(atchFileSn, files, UploadProfile.GENERAL);",
                boardUpdate + " storeFileDetails(uncheckedMaster, files, 1);")) {
            String bypassed = good.replace(boardUpdate, unsafeCall);
            assertTrue(attachmentMethodViolations(Map.of(path, bypassed), rules).stream()
                    .anyMatch(value -> value.contains("#updateBoardFiles") && value.contains("단일 위임")), unsafeCall);
        }

        String reusedGroup = good.replace("fileMasterRepository.save(FileMaster.create())",
                "fileMasterRepository.findById(atchFileSn).orElseThrow()");
        assertTrue(attachmentMethodViolations(Map.of(path, reusedGroup), rules).stream()
                .anyMatch(value -> value.contains("#createFileGroup") && value.contains("금지된 쓰기/재사용")));

        Map<String, AttachmentMethodRule> missingHelperRule = new LinkedHashMap<>(rules);
        missingHelperRule.remove(path + "#appendToFileGroup");
        assertTrue(attachmentMethodViolations(Map.of(path, good), missingHelperRule).stream()
                .anyMatch(value -> value.contains("미등록 소비 메서드") && value.contains("#appendToFileGroup")));

        String unknownCallerPath = "business-app/src/main/java/example/NewService.java";
        String unknownCaller = """
                class NewService {
                    public void create(Files files) {
                        fileService.uploadBoardFiles(files);
                    }
                }
                """;
        assertTrue(attachmentMethodViolations(Map.of(unknownCallerPath, unknownCaller), Map.of()).stream()
                .anyMatch(value -> value.contains("미등록 소비 메서드") && value.contains("#create")));
    }

    @Test
    @DisplayName("🔒 Board 소유권 가드는 첨부 조회·업로드·갱신보다 먼저 실행된다")
    void auditBoardOwnerGuardPrecedesEveryAttachmentMutation() throws IOException {
        String path = "business-app/src/main/java/nuri/business/service/board/BoardService.java";
        if (!ReusableHarnessProfile.current().retainsSource(path)) return;
        String source = loadAttachmentServiceSources().get(path);
        assertNotNull(source, "BoardService 소스를 찾을 수 없다");

        List<String> violations = boardOwnershipOrderViolations(path, source);
        if (!violations.isEmpty()) {
            fail("Board 첨부 변경의 소유권 선행 계약 위반:\n - " + String.join("\n - ", violations));
        }
    }

    @Test
    @DisplayName("🔒 Board 소유권 순서 게이트는 upload/update 선행 변이를 red로 검출한다")
    void boardOwnerOrderGateRejectsSyntheticRegressions() {
        String path = "business-app/src/main/java/nuri/business/service/board/BoardService.java";
        String good = """
                class BoardService {
                    public void updatePost(Long pstSn, Request request) {
                        Board board = findOwnedPost(bbsId, pstSn);
                        updateOwnedPost(board, request, false);
                    }
                    public Long createPostWithFiles(Request request, Files files) {
                        BoardMaster master = loadWritableMaster(request.bbsId(), false);
                        atchFileSn = fileService.uploadBoardFiles(files);
                        return createPost(userId, request);
                    }
                    public Long replyPostWithFiles(Long parentSn, Request request, Files files) {
                        BoardMaster master = loadWritableMaster(request.bbsId(), false);
                        atchFileSn = fileService.uploadBoardFiles(files);
                        return replyPost(userId, parentSn, request);
                    }
                    public void updatePostWithFiles(Long pstSn, Request request, Files files) {
                        BoardMaster master = loadWritableMaster(bbsId, false);
                        Board board = findOwnedPost(bbsId, pstSn);
                        attachmentAssignmentPolicy.assertAssignable(atchFileSn);
                        fileService.uploadBoardFiles(files);
                        fileService.updateBoardFiles(atchFileSn, files);
                        updateOwnedPost(board, request, true);
                    }
                }
                """;
        assertTrue(boardOwnershipOrderViolations(path, good).isEmpty());

        String uploadBeforeOwner = good.replace(
                "Board board = findOwnedPost(bbsId, pstSn);\n        attachmentAssignmentPolicy",
                "fileService.uploadBoardFiles(files);\n        Board board = findOwnedPost(bbsId, pstSn);\n"
                        + "        attachmentAssignmentPolicy")
                .replace("        fileService.uploadBoardFiles(files);\n        fileService.updateBoardFiles",
                        "        fileService.updateBoardFiles");
        assertTrue(boardOwnershipOrderViolations(path, uploadBeforeOwner).stream()
                .anyMatch(value -> value.contains("fileService.uploadBoardFiles(") && value.contains("소유권보다 앞")));

        String updateBeforeOwner = good.replace(
                "Board board = findOwnedPost(bbsId, pstSn);\n        attachmentAssignmentPolicy",
                "fileService.updateBoardFiles(atchFileSn, files);\n"
                        + "        Board board = findOwnedPost(bbsId, pstSn);\n        attachmentAssignmentPolicy")
                .replace("        fileService.updateBoardFiles(atchFileSn, files);\n        updateOwnedPost",
                        "        updateOwnedPost");
        assertTrue(boardOwnershipOrderViolations(path, updateBeforeOwner).stream()
                .anyMatch(value -> value.contains("fileService.updateBoardFiles(") && value.contains("소유권보다 앞")));

        String generalUploadBeforeOwner = uploadBeforeOwner.replace("uploadBoardFiles", "uploadFiles");
        assertTrue(boardOwnershipOrderViolations(path, generalUploadBeforeOwner).stream()
                .anyMatch(value -> value.contains("fileService.uploadFiles(") && value.contains("소유권보다 앞")));
        String generalUpdateBeforeOwner = updateBeforeOwner.replace("updateBoardFiles", "updateFiles");
        assertTrue(boardOwnershipOrderViolations(path, generalUpdateBeforeOwner).stream()
                .anyMatch(value -> value.contains("fileService.updateFiles(") && value.contains("소유권보다 앞")));

        String assignmentBeforeOwner = good.replace(
                "Board board = findOwnedPost(bbsId, pstSn);\n        attachmentAssignmentPolicy",
                "attachmentAssignmentPolicy.assertAssignable(atchFileSn);\n"
                        + "        Board board = findOwnedPost(bbsId, pstSn);\n        voidPolicy")
                .replace("        voidPolicy.assertAssignable(atchFileSn);\n        fileService.uploadBoardFiles",
                        "        fileService.uploadBoardFiles");
        assertTrue(boardOwnershipOrderViolations(path, assignmentBeforeOwner).stream()
                .anyMatch(value -> value.contains("assertAssignable(atchFileSn)")
                        && value.contains("소유권보다 앞")));

        String entityUpdateBeforeOwner = good.replace(
                "Board board = findOwnedPost(bbsId, pstSn);\n        updateOwnedPost(board, request, false);",
                "Board board = findUnownedPost(pstSn);\n"
                        + "        updateOwnedPost(board, request, false);\n"
                        + "        board = findOwnedPost(bbsId, pstSn);");
        assertTrue(boardOwnershipOrderViolations(path, entityUpdateBeforeOwner).stream()
                .anyMatch(value -> value.contains("updateOwnedPost(") && value.contains("소유권보다 앞")));

        // [2026-10-23 ADR-0040 결정 1] 게시판 판정보다 앞선 파일 저장, 판정 자체의 소실은 등록·답글·수정 모두 red 다.
        for (String method : List.of("createPostWithFiles", "replyPostWithFiles")) {
            String next = method.startsWith("create") ? "return createPost(" : "return replyPost(";
            String gateAfterUpload = good.replace(
                    "BoardMaster master = loadWritableMaster(request.bbsId(), false);\n"
                            + "        atchFileSn = fileService.uploadBoardFiles(files);\n        " + next,
                    "atchFileSn = fileService.uploadBoardFiles(files);\n"
                            + "        BoardMaster master = loadWritableMaster(request.bbsId(), false);\n        " + next);
            assertTrue(boardOwnershipOrderViolations(path, gateAfterUpload).stream()
                    .anyMatch(value -> value.contains("#" + method) && value.contains("uploadBoardFiles(")
                            && value.contains("게시판 판정보다 앞")), method);
            String gateMissing = good.replace(
                    "BoardMaster master = loadWritableMaster(request.bbsId(), false);\n"
                            + "        atchFileSn = fileService.uploadBoardFiles(files);\n        " + next,
                    "BoardMaster master = findBoardMaster(request.bbsId());\n"
                            + "        atchFileSn = fileService.uploadBoardFiles(files);\n        " + next);
            assertTrue(boardOwnershipOrderViolations(path, gateMissing).stream()
                    .anyMatch(value -> value.contains("#" + method) && value.contains("게시판 판정 토큰 소실")), method);
        }
        String updateGateLate = good.replace(
                        "BoardMaster master = loadWritableMaster(bbsId, false);\n        Board board", "Board board")
                .replace("fileService.updateBoardFiles(atchFileSn, files);\n        updateOwnedPost(board, request, true);",
                        "fileService.updateBoardFiles(atchFileSn, files);\n"
                                + "        BoardMaster master = loadWritableMaster(bbsId, false);\n"
                                + "        updateOwnedPost(board, request, true);");
        assertTrue(boardOwnershipOrderViolations(path, updateGateLate).stream()
                .anyMatch(value -> value.contains("#updatePostWithFiles") && value.contains("updateBoardFiles(")
                        && value.contains("게시판 판정보다 앞")));
    }

    private Map<String, String> loadAttachmentServiceSources() throws IOException {
        Path repoRoot = HarnessSourceIndex.repoRoot();
        Map<String, String> result = new LinkedHashMap<>();
        for (Path path : HarnessSourceIndex.productionJavaSources("business-core", "business-app")) {
            String relative = repoRoot.relativize(path).toString().replace('\\', '/');
            if (relative.contains("/src/main/java/nuri/business/service/")) {
                result.put(relative, HarnessSourceIndex.read(path));
            }
        }
        return result;
    }

    private static List<String> attachmentMethodViolations(
            Map<String, String> sourceByPath,
            Map<String, AttachmentMethodRule> rules) {
        Map<String, String> methodBodies = new LinkedHashMap<>();
        Set<String> discovered = new TreeSet<>();
        List<String> violations = new ArrayList<>();

        sourceByPath.forEach((path, rawSource) -> {
            String source = stripCommentsAndLiterals(rawSource);
            Map<String, String> methods = extractMethods(source, path, violations);
            methods.forEach((methodName, body) -> {
                String key = path + "#" + methodName;
                methodBodies.put(key, body);
                if (containsAttachmentCarrier(body) || UPLOAD_ENTRY_POINTS.contains(methodName)) {
                    discovered.add(key);
                }
            });
        });

        Set<String> expected = new TreeSet<>(rules.keySet());
        discovered.stream().filter(key -> !expected.contains(key))
                .forEach(key -> violations.add("미등록 소비 메서드: " + key));
        expected.stream().filter(key -> !discovered.contains(key))
                .forEach(key -> violations.add("등록 메서드의 첨부 소비 토큰 소실: " + key));

        rules.forEach((key, rule) -> {
            String body = methodBodies.get(key);
            if (body == null) {
                return;
            }
            String normalized = body.replaceAll("\\s+", "");
            if (rule.soleDelegate()
                    && !normalized.equals("{" + rule.requiredToken().replaceAll("\\s+", "") + ";}")) {
                violations.add("업로드 진입점의 단일 위임 계약 위반: " + key);
            }
            for (String forbiddenToken : rule.forbiddenTokens()) {
                if (normalized.contains(forbiddenToken.replaceAll("\\s+", ""))) {
                    violations.add("금지된 쓰기/재사용 토큰 출현: " + key + " -> " + forbiddenToken);
                }
            }
            if (rule.requiredToken().isBlank()) {
                return;
            }
            String required = rule.requiredToken().replaceAll("\\s+", "");
            int requiredIndex = normalized.indexOf(required);
            if (requiredIndex < 0) {
                violations.add("가드 토큰 소실: " + key + " -> " + rule.requiredToken());
                return;
            }
            for (String mutationToken : rule.mutationTokens()) {
                String mutation = mutationToken.replaceAll("\\s+", "");
                int mutationIndex = normalized.indexOf(mutation);
                if (mutationIndex < 0) {
                    violations.add("저장/위임 토큰 소실: " + key + " -> " + mutationToken);
                } else if (requiredIndex >= mutationIndex) {
                    violations.add("첨부 가드가 저장보다 뒤에 있음: " + key
                            + " -> " + mutationToken);
                }
            }
        });
        return violations;
    }

    private static List<String> boardOwnershipOrderViolations(String path, String rawSource) {
        List<String> violations = new ArrayList<>();
        Map<String, String> methods = extractMethods(stripCommentsAndLiterals(rawSource), path, violations);
        requireTokenBeforeMutations(methods, path, "updatePost",
                "findOwnedPost(bbsId, pstSn)", OWNERSHIP, List.of("updateOwnedPost("), true, violations);
        requireTokenBeforeMutations(methods, path, "updatePostWithFiles",
                "findOwnedPost(bbsId, pstSn)", OWNERSHIP,
                List.of("attachmentAssignmentPolicy.assertAssignable(atchFileSn)",
                        "fileService.uploadBoardFiles(", "fileService.updateBoardFiles(", "updateOwnedPost("),
                true, violations);
        // 새 프로필 외에 기존 일반 진입점을 끼워 넣어도 소유권 선행 검사를 피할 수 없다.
        requireTokenBeforeMutations(methods, path, "updatePostWithFiles",
                "findOwnedPost(bbsId, pstSn)", OWNERSHIP,
                List.of("fileService.uploadFiles(", "fileService.updateFiles("), false, violations);
        // [2026-10-23 ADR-0040 결정 1] 게시판 쓰기 진입 판정(지정 게시판·사용 여부·커뮤니티)은 파일 저장보다 먼저다 — 닫힌
        //   게시판에서 거부될 요청이 디스크에 파일을 남기지 않는다(DIP I2 의 순서를 사용 여부까지 넓힌다).
        for (String[] gate : new String[][] {
                {"createPostWithFiles", "loadWritableMaster(request.bbsId(), false)"},
                {"replyPostWithFiles", "loadWritableMaster(request.bbsId(), false)"},
                {"updatePostWithFiles", "loadWritableMaster(bbsId, false)"}}) {
            requireTokenBeforeMutations(methods, path, gate[0], gate[1], BOARD_GATE,
                    List.of("fileService.uploadBoardFiles(", "fileService.updateBoardFiles(",
                            "fileService.uploadFiles(", "fileService.updateFiles("),
                    false, violations);
        }
        return violations;
    }

    private static final String OWNERSHIP = "소유권";
    private static final String BOARD_GATE = "게시판 판정";

    private static void requireTokenBeforeMutations(
            Map<String, String> methods,
            String path,
            String methodName,
            String ownerToken,
            String guardLabel,
            List<String> mutationTokens,
            boolean requireMutations,
            List<String> violations) {
        String key = path + "#" + methodName;
        String body = methods.get(methodName);
        if (body == null) {
            violations.add("Board 메서드 소실: " + key);
            return;
        }
        String normalized = body.replaceAll("\\s+", "");
        int ownerIndex = normalized.indexOf(ownerToken.replaceAll("\\s+", ""));
        if (ownerIndex < 0) {
            violations.add("Board " + guardLabel + " 토큰 소실: " + key + " -> " + ownerToken);
            return;
        }
        for (String mutationToken : mutationTokens) {
            int mutationIndex = normalized.indexOf(mutationToken.replaceAll("\\s+", ""));
            if (mutationIndex < 0) {
                if (requireMutations) {
                    violations.add("Board 첨부 변경 토큰 소실: " + key + " -> " + mutationToken);
                }
            } else if (mutationIndex < ownerIndex) {
                violations.add("Board 첨부 변경이 " + guardLabel + "보다 앞에 있음: " + key + " -> " + mutationToken);
            }
        }
    }

    private static Map<String, String> extractMethods(
            String source, String path, List<String> violations) {
        Map<String, String> result = new LinkedHashMap<>();
        Matcher matcher = METHOD_DECLARATION.matcher(source);
        while (matcher.find()) {
            String methodName = matcher.group(1);
            int open = source.indexOf('{', matcher.end());
            int semicolon = source.indexOf(';', matcher.end());
            if (open < 0 || (semicolon >= 0 && semicolon < open)) {
                continue;
            }
            int close = matchingBrace(source, open);
            if (close < 0) {
                violations.add("메서드 괄호 탐색 실패: " + path + "#" + methodName);
                continue;
            }
            String body = source.substring(open, close + 1);
            String prior = result.putIfAbsent(methodName, body);
            if (prior != null
                    && (containsAttachmentCarrier(prior)
                            || containsAttachmentCarrier(body)
                            || UPLOAD_ENTRY_POINTS.contains(methodName))) {
                violations.add("첨부 소비 overloaded 메서드는 현재 key로 구분할 수 없음: "
                        + path + "#" + methodName);
            }
        }
        return result;
    }

    private static boolean containsAttachmentCarrier(String body) {
        return ATTACHMENT_USAGE.matcher(body).find()
                || LOCAL_ATTACHMENT_STORAGE_USAGE.matcher(body).find()
                || (ATTACHMENT_IDENTIFIER.matcher(body).find()
                        && ASSIGNMENT_MUTATION.matcher(body).find());
    }

    private static int matchingBrace(String source, int open) {
        int depth = 0;
        for (int index = open; index < source.length(); index++) {
            char ch = source.charAt(index);
            if (ch == '{') {
                depth++;
            } else if (ch == '}' && --depth == 0) {
                return index;
            }
        }
        return -1;
    }

    /** 주석·문자열 decoy가 가드/쓰기 토큰을 대신하지 못하게 실행 코드만 남긴다. */
    private static String stripCommentsAndLiterals(String source) {
        StringBuilder out = new StringBuilder(source.length());
        boolean lineComment = false;
        boolean blockComment = false;
        boolean string = false;
        boolean character = false;
        boolean escaped = false;
        for (int index = 0; index < source.length(); index++) {
            char ch = source.charAt(index);
            char next = index + 1 < source.length() ? source.charAt(index + 1) : '\0';
            if (lineComment) {
                if (ch == '\n') {
                    lineComment = false;
                    out.append(ch);
                } else {
                    out.append(' ');
                }
                continue;
            }
            if (blockComment) {
                if (ch == '*' && next == '/') {
                    out.append("  ");
                    index++;
                    blockComment = false;
                } else {
                    out.append(ch == '\n' ? '\n' : ' ');
                }
                continue;
            }
            if (string || character) {
                if (escaped) {
                    escaped = false;
                } else if (ch == '\\') {
                    escaped = true;
                } else if ((string && ch == '"') || (character && ch == '\'')) {
                    string = false;
                    character = false;
                }
                out.append(ch == '\n' ? '\n' : ' ');
                continue;
            }
            if (ch == '/' && next == '/') {
                out.append("  ");
                index++;
                lineComment = true;
            } else if (ch == '/' && next == '*') {
                out.append("  ");
                index++;
                blockComment = true;
            } else if (ch == '"') {
                out.append(' ');
                string = true;
            } else if (ch == '\'') {
                out.append(' ');
                character = true;
            } else {
                out.append(ch);
            }
        }
        return out.toString();
    }

    private static AttachmentMethodRule readOnly() {
        return new AttachmentMethodRule("", List.of(), List.of(
                ".save(", ".saveAll(", ".saveAndFlush(",
                ".delete(", ".deleteById(", ".deleteAll(",
                ".update(", ".updateAll(", ".setAtchFileSn("), false);
    }

    private static AttachmentMethodRule required(String requiredToken) {
        return new AttachmentMethodRule(requiredToken, List.of(), List.of(), false);
    }

    private static AttachmentMethodRule delegate(String requiredToken, String... forbiddenDirectSinks) {
        return new AttachmentMethodRule(requiredToken, List.of(), List.of(forbiddenDirectSinks), false);
    }

    private static AttachmentMethodRule uploadDelegate(String invocation) {
        return new AttachmentMethodRule(invocation, List.of(), List.of(), true);
    }

    private static AttachmentMethodRule guarded(String guardToken, String... mutationTokens) {
        return new AttachmentMethodRule(guardToken, List.of(mutationTokens), List.of(), false);
    }

    private static AttachmentMethodRule generatedUpload() {
        return new AttachmentMethodRule(
                "fileMasterRepository.save(FileMaster.create())",
                List.of("storeFileDetails("),
                List.of("fileMasterRepository.findById("), false);
    }

    private record AttachmentMethodRule(
            String requiredToken,
            List<String> mutationTokens,
            List<String> forbiddenTokens,
            boolean soleDelegate) {
    }

    private Collection<AttachmentSource> scanContributedSources() {
        ClassPathScanningCandidateComponentProvider scanner =
                new ClassPathScanningCandidateComponentProvider(false);
        scanner.addIncludeFilter(new AssignableTypeFilter(AttachmentSourceContributor.class));
        List<AttachmentSource> sources = new ArrayList<>();
        scanner.findCandidateComponents(ENTITY_SCAN_BASE).stream()
                .map(candidate -> candidate.getBeanClassName())
                .sorted()
                .forEach(className -> {
                    try {
                        Class<?> type = Class.forName(className);
                        if (type.isInterface()) {
                            return;
                        }
                        AttachmentSourceContributor contributor =
                                (AttachmentSourceContributor) type.getDeclaredConstructor().newInstance();
                        sources.addAll(contributor.sources());
                    } catch (ReflectiveOperationException ex) {
                        fail("첨부 참조원 contributor를 로드할 수 없다: " + className + " — " + ex.getMessage());
                    }
                });
        if (sources.isEmpty()) {
            fail("첨부 참조원 contributor 스캔 결과가 0이다 — component/classpath 파손 의심.");
        }
        return sources;
    }

    /** 모든 {@code @Entity} 의 물리 테이블명. URL 연결 참조원의 실존 확인에 쓴다. */
    private Set<String> scanAllEntityTables() {
        Set<String> tables = new TreeSet<>();
        ClassPathScanningCandidateComponentProvider scanner =
                new ClassPathScanningCandidateComponentProvider(false);
        scanner.addIncludeFilter(new AnnotationTypeFilter(Entity.class));
        for (var bd : scanner.findCandidateComponents(ENTITY_SCAN_BASE)) {
            try {
                Class<?> clazz = Class.forName(bd.getBeanClassName());
                Table table = AnnotationUtils.findAnnotation(clazz, Table.class);
                if (table != null && !table.name().isBlank()) {
                    tables.add(table.name().toLowerCase());
                }
            } catch (ClassNotFoundException | LinkageError ex) {
                log.warn("[AttachmentRegistryGate] 엔티티 로드 실패(스캔 제외): {} ({})",
                        bd.getBeanClassName(), ex.getMessage());
            }
        }
        return tables;
    }

    /** {@code atchFileSn} 필드를 보유한 {@code @Entity} 를 스캔해 (물리 테이블 → 엔티티명) 으로 환원한다. */
    private Map<String, String> scanEntitiesHoldingAttachmentSn() {
        Map<String, String> result = new LinkedHashMap<>();

        ClassPathScanningCandidateComponentProvider scanner =
                new ClassPathScanningCandidateComponentProvider(false);
        scanner.addIncludeFilter(new AnnotationTypeFilter(Entity.class));

        for (var bd : scanner.findCandidateComponents(ENTITY_SCAN_BASE)) {
            String className = bd.getBeanClassName();
            try {
                Class<?> clazz = Class.forName(className);
                if (!hasAttachmentField(clazz)) {
                    continue;
                }
                Table table = AnnotationUtils.findAnnotation(clazz, Table.class);
                if (table == null || table.name().isBlank()) {
                    fail("@Table(name=...) 이 없는 엔티티가 atchFileSn 를 보유합니다: " + className
                            + " — 물리 테이블을 특정할 수 없어 첨부 인가 레지스트리와 대조할 수 없습니다.");
                    continue;
                }
                String tableName = table.name().toLowerCase();
                if (ATTACHMENT_STORAGE_TABLES.contains(tableName)) {
                    continue; // 참조 대상(첨부 저장소) 자신.
                }
                result.put(tableName, clazz.getSimpleName());
            } catch (ClassNotFoundException | LinkageError ex) {
                log.warn("[AttachmentRegistryGate] 엔티티 로드 실패(스캔 제외): {} ({})", className, ex.getMessage());
            }
        }
        return result;
    }

    private boolean hasAttachmentField(Class<?> clazz) {
        for (Class<?> c = clazz; c != null && c != Object.class; c = c.getSuperclass()) {
            for (Field field : c.getDeclaredFields()) {
                if (ATTACHMENT_FIELD.equals(field.getName())) {
                    return true;
                }
            }
        }
        return false;
    }
}
