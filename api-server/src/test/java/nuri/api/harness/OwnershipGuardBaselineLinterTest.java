package nuri.api.harness;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Set;
import java.util.TreeSet;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;
import java.util.stream.Stream;

import static org.junit.jupiter.api.Assertions.fail;

/**
 * 🔐 소유권/권한 가드 축 동결 린터 — 인가 가드의 <b>완화·소실</b>을 기계적으로 차단한다.
 *
 * <p>[근거] 2026-07-26 Phase 2 감사. 워커가 "SecurityUtil 표준화" 라는 이름으로
 * {@code InformalSanctionService} 3개소의 가드를 <i>신청자 본인</i> → <i>본인 또는 관리자</i> 로
 * <b>넓혔다</b>(과제 요구는 IDOR 차단이므로 정반대). 컴파일·테스트는 전부 그린이었다. 가드의 '유무'는
 * 리뷰에서 눈에 띄지만 가드의 '종류'가 바뀌는 것은 눈에 띄지 않는다 — 그래서 축을 동결한다.
 *
 * <p>동결 대상은 {@code SecurityUtil} 인가 헬퍼의 호출 census 다:
 * <ul>
 *   <li>{@code assertOwnerByEsntlId} — 엄격 소유자(관리자 우회 <b>불가</b>). 결재·신청 등 인격 귀속 행위</li>
 *   <li>{@code assertOwnerOrAdminByEsntlId} / {@code assertOwnerOrAdmin} — 소유자 또는 관리자(우회 <b>가능</b>)</li>
 *   <li>{@code assertAdmin} — 관리자 전용</li>
 * </ul>
 * 종류가 바뀌거나(권한 완화/강화) 호출이 사라지면(가드 소실 = IDOR 회귀) 이 게이트가 붉어진다.
 *
 * <p><b>정당한 변경 절차</b>: ① 변경 사유(도메인이 대리 수행을 허용하는가?)를 기록하고 ② 아래
 * {@link #FROZEN_CENSUS} 를 갱신한다. 갱신 자체는 {@code HarnessBaselineIntegrityTest} 매니페스트에
 * 다시 잡히므로 두 파일이 함께 바뀐다 — 조용한 완화가 불가능하다.
 *
 * <p>Spring 컨텍스트를 띄우지 않는 순수 정적 테스트(소스 텍스트 파싱).
 */
class OwnershipGuardBaselineLinterTest {

    private static final Logger log = LoggerFactory.getLogger(OwnershipGuardBaselineLinterTest.class);

    /** 스캔 루트 — 저장소 루트 기준 상대 경로 */
    private static final List<String> SCAN_ROOTS = List.of(
            "business-core/src/main/java",
            "business-app/src/main/java",
            "api-server/src/main/java",
            "foundation/src/main/java");

    private static final String ACTUAL_OUT = "build/harness/ownership-guard-census.actual.txt";

    /** {@code SecurityUtil.assertXxx(} 호출 — 주석 제거 후 매칭(javadoc {@code #assertXxx} 은 미매칭) */
    private static final Pattern GUARD_CALL = Pattern.compile(
            "SecurityUtil\\s*\\.\\s*(assertOwnerByEsntlId|assertOwnerOrAdminByEsntlId|assertOwnerOrAdmin|assertAdmin)\\s*\\(");

    /**
     * [동결 census] {@code 클래스#메서드#헬퍼=호출수}. <b>가드 완화·소실·메서드 간 이동 차단이 목적</b>이므로
     * 추가/삭제/교체/메서드이동 전부 위반으로 잡는다. 신규 가드 도입 시에도 이 목록을 함께 갱신한다.
     */
    private static final Set<String> FROZEN_CENSUS = new TreeSet<>(Arrays.asList(
            "AddressBookService#deleteAddressBook#assertOwnerOrAdmin=1",
            "AddressBookService#getAddressBook#assertOwnerOrAdmin=1",
            "AddressBookService#updateAddressBook#assertOwnerOrAdmin=1",
            "BoardService#deletePost#assertOwnerOrAdminByEsntlId=1",
            "BoardService#updatePost#assertOwnerOrAdminByEsntlId=1",
            "CommentService#deleteComment#assertOwnerOrAdmin=1",
            "CommentService#updateComment#assertOwnerOrAdmin=1",
            "DeptJobBoxService#createDeptJobBox#assertAdmin=1",
            "DeptJobBoxService#deleteDeptJobBox#assertAdmin=1",
            "DeptJobBoxService#updateDeptJobBox#assertAdmin=1",
            "DeptJobService#assertPicOrAdmin#assertOwnerOrAdmin=1",
            "DeptJobService#assertPicOrAdmin#assertOwnerOrAdminByEsntlId=1",
            "InformalSanctionService#confirmInformalSanction#assertOwnerByEsntlId=1",
            "InformalSanctionService#deleteInformalSanction#assertOwnerByEsntlId=1",
            "InformalSanctionService#updateInformalSanction#assertOwnerByEsntlId=1",
            "MailService#deleteMail#assertOwnerOrAdmin=1",
            "MailService#getSentMail#assertOwnerOrAdmin=1",
            "MemoReportService#deleteMemoReport#assertOwnerOrAdmin=1",
            "MemoReportService#getMemoReportList#assertAdmin=1",
            "MemoReportService#updateMemoReport#assertOwnerOrAdmin=1",
            "OnlinePollService#deletePoll#assertAdmin=1",
            "OnlinePollService#insertPoll#assertAdmin=1",
            "OnlinePollService#updatePoll#assertAdmin=1",
            "ScheduleService#deleteSchedule#assertOwnerOrAdmin=1",
            "ScheduleService#getSchedule#assertOwnerOrAdmin=1",
            "ScheduleService#updateSchedule#assertOwnerOrAdmin=1",
            // [2026-08-06 추가] 만족도(D-8) 배선. 이 두 줄은 '완화' 가 아니라 '신설' 이다 —
            // 종전 SatisfactionService 에는 인가 가드가 하나도 없었고, deleteSatisfaction 은
            // pswd 파라미터를 받고도 검사하지 않아 ID만 알면 남의 만족도를 지울 수 있었다.
            // 컨트롤러가 없어 도달 불가였던 덕에 노출되지 않았을 뿐이며, 배선하면서 함께 고쳤다.
            //  · assertCanModify   → 로그인 작성분의 소유자/관리자 판정(익명 작성분은 비밀번호 분기)
            //  · deleteByModerator → 욕설·스팸 대리 삭제. 비밀번호 없이 지우므로 관리자 전용을 명시
            "SatisfactionService#assertCanModify#assertOwnerOrAdmin=1",
            "SatisfactionService#deleteByModerator#assertAdmin=1",
            "ScrapService#deleteScrap#assertOwnerOrAdmin=1",
            "ScrapService#getScrap#assertOwnerOrAdmin=1",
            "ScrapService#updateScrap#assertOwnerOrAdmin=1",
            "UserService#deleteUser#assertAdmin=1",
            "UserService#deleteUserList#assertAdmin=1",
            "UserService#moveUsersToDept#assertAdmin=1",
            "UserService#registerUser#assertAdmin=1",
            "UserService#updatePasswordByAdmin#assertAdmin=1",
            "UserService#updateUser#assertOwnerOrAdminByEsntlId=1",
            "UserService#updateUsersRole#assertAdmin=1",
            "UserService#updateUsersStatus#assertAdmin=1",
            "WorkReportService#deleteWorkReport#assertOwnerOrAdmin=1",
            "WorkReportService#getWorkReport#assertOwnerOrAdmin=1",
            "WorkReportService#updateWorkReport#assertOwnerOrAdmin=1"));

    @Test
    @DisplayName("🔐 소유권/권한 가드 census 동결 — 인가 완화(엄격→관리자우회)·가드 소실·메서드간 이동 차단")
    void auditOwnershipGuardCensus() throws IOException {
        Set<String> actual = new TreeSet<>();
        int scannedFiles = 0;

        for (String root : SCAN_ROOTS) {
            Path dir = resolveFromRepoRoot(root);
            if (!Files.isDirectory(dir)) {
                fail("게이트 무결성 파손: 스캔 루트를 찾을 수 없습니다 — " + root
                        + " (workingDir=" + Paths.get("").toAbsolutePath() + "). 조용한 skip 은 false-green 입니다.");
            }
            try (Stream<Path> paths = Files.walk(dir)) {
                List<Path> files = paths.filter(Files::isRegularFile)
                        .filter(p -> p.toString().endsWith(".java"))
                        .filter(p -> !p.getFileName().toString().equals("SecurityUtil.java"))
                        .sorted()
                        .collect(Collectors.toList());
                scannedFiles += files.size();
                for (Path file : files) {
                    collectGuards(file, actual);
                }
            }
        }

        // 게이트 무결성(false-green 방지): 스캔이 조용히 붕괴하면 census 가 비어 통과하므로 차단
        if (scannedFiles < 200) {
            fail("게이트 무결성 파손: 소스 스캔 건수(" + scannedFiles + ")가 예상 하한(200) 미만 — 경로/스캔 파손 의심.");
        }

        writeActual(actual);

        List<String> weakened = new ArrayList<>();
        List<String> vanished = new ArrayList<>();
        for (String entry : actual) {
            if (!FROZEN_CENSUS.contains(entry)) {
                weakened.add(entry);
            }
        }
        for (String entry : FROZEN_CENSUS) {
            if (!actual.contains(entry)) {
                vanished.add(entry);
            }
        }

        if (!weakened.isEmpty() || !vanished.isEmpty()) {
            StringBuilder sb = new StringBuilder();
            sb.append("\n========================================================================\n");
            sb.append("🔐 [OWNERSHIP GUARD LINTER] 인가 가드 census 드리프트가 차단되었습니다!\n");
            sb.append("========================================================================\n");
            for (String v : vanished) {
                sb.append("❌ 소실/변경: ").append(v).append(" — 동결된 가드가 현재 소스에 없음\n");
            }
            for (String v : weakened) {
                sb.append("❌ 신규/변경: ").append(v).append(" — 동결 census 에 없는 가드 호출\n");
            }
            sb.append("\n💡 특히 확인할 것: 엄격 가드(assertOwnerByEsntlId) 가 관리자 우회형\n");
            sb.append("   (assertOwnerOrAdmin*) 으로 바뀌지 않았습니까? 그것은 '표준화' 가 아니라 권한 완화입니다.\n");
            sb.append("   반대로 프라이버시 가드(쪽지 등)를 표준 헬퍼로 치환하면 관리자가 사인(私信)을 열람하게 됩니다.\n");
            sb.append("   (GEMINI.md §0.7-H3 — 도메인 맥락별 대리 수행 허용 여부를 먼저 판정할 것)\n");
            sb.append("\n💡 변경이 정당하면 사유를 기록하고 FROZEN_CENSUS 를 갱신하십시오. 산출된 실제 census:\n");
            sb.append("   ").append(Paths.get(ACTUAL_OUT).toAbsolutePath()).append("\n");
            fail(sb.toString());
        }

        log.info("✅ 인가 가드 census 동결 유지 — {}개 항목(파일 {}건 스캔).", actual.size(), scannedFiles);
    }

    private static void collectGuards(Path file, Set<String> sink) throws IOException {
        String code = HarnessBaselineIntegrityTest.stripCommentsPreservingStrings(
                Files.readString(file, StandardCharsets.UTF_8));
        Matcher m = GUARD_CALL.matcher(code);
        String className = file.getFileName().toString().replace(".java", "");
        java.util.Map<String, Integer> counts = new java.util.TreeMap<>();
        while (m.find()) {
            int pos = m.start();
            String methodName = findEnclosingMethod(code, pos);
            String helper = m.group(1);
            String key = className + "#" + methodName + "#" + helper;
            counts.merge(key, 1, Integer::sum);
        }
        counts.forEach((key, count) -> sink.add(key + "=" + count));
    }

    private static String findEnclosingMethod(String code, int pos) {
        String prefix = code.substring(0, pos);
        Pattern p = Pattern.compile("(?:public|protected|private|static|final|synchronized|\\s)+\\s+[\\w\\<\\>\\[\\]]+\\s+([a-zA-Z0-9_]+)\\s*\\([^\\)]*\\)\\s*(?:throws\\s+[\\w\\s,]+)?\\s*\\{");
        Matcher m = p.matcher(prefix);
        String lastMethod = "unknown";
        while (m.find()) {
            lastMethod = m.group(1);
        }
        return lastMethod;
    }

    private static void writeActual(Set<String> actual) {
        try {
            Path out = Paths.get(ACTUAL_OUT);
            Files.createDirectories(out.getParent());
            Files.write(out, actual, StandardCharsets.UTF_8);
        } catch (IOException e) {
            log.warn("[OwnershipGuardLinter] 실제 census 산출 실패: {}", e.getMessage());
        }
    }

    /** 모듈(api-server) 실행 / 루트 실행 양쪽 지원 */
    private static Path resolveFromRepoRoot(String relative) {
        Path fromRoot = Paths.get(relative);
        if (Files.exists(fromRoot)) {
            return fromRoot;
        }
        return Paths.get("..", relative);
    }
}
