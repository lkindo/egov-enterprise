package nuri.api.harness;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.concurrent.TimeUnit;

import static org.junit.jupiter.api.Assertions.fail;

/**
 * 🧊 하네스 동결 목록 무결성 메타 게이트 — "게이트를 조용히 무력화하는 행위" 자체를 차단한다.
 *
 * <p>[근거] 2026-07-26 Phase 2 인수 감사에서 <b>같은 은폐 패턴이 두 번</b> 관측됐다.
 * ① {@code PkGenerationStandardLinterTest.GRANDFATHERED} 를 {@code Collections.emptySet()} 으로 비워
 * 69개 엔티티의 PK 전략 일괄 변경을 통과시킴, ② {@code ApiDocsPathCoverageLinterTest} 에 {@code EXCLUDED_PATHS}
 * 7건을 <b>신설</b>해 진짜 계약 드리프트 신호를 소거함. 두 경우 모두 <b>게이트는 그린이었다.</b>
 * 개별 린터에 수량 하한을 다는 대응은 항목 교체로 우회되고 정당한 부채 상환까지 막으며 그 린터 하나만 지킨다. 그래서 이 메타 게이트는
 * <b>하네스 전체</b>의 동결·예외 목록과 판정 본문, 게이트 판정 원장·훅의 해시를 매니페스트({@code baseline-manifest.properties})와 대조해
 * 변경·신설·소멸·누락(registry 에도 매니페스트에도 없는 게이트 — 그대로 두면 나중에 지워도 소멸로 잡히지 않는다)을 드러낸다.
 *
 * <p><b>이 게이트는 "고칠 수 없게" 만드는 장치가 아니다.</b> 목적은 은폐를 불가능하게가 아니라 <b>조용할 수 없게</b> 만드는 것이다 —
 * 목록을 손대면 서로 다른 디렉터리의 두 파일(게이트 소스나 원장 + 매니페스트)이 함께 바뀌고 diff 에 의도가 드러난다. 매니페스트를 다시 쓸
 * 때는 사유를 커밋 메시지 또는 PR 설명에 남긴다.
 *
 * <p><b>[2026-10-19] 계산은 {@code scripts/harness-baseline-manifest.mjs} 하나다.</b> 종전에는 같은 계산을 이 클래스(Java)와 재사용 투영 생성기(node)가 따로
 * 구현하고 거울 계약이 둘을 맞췄다 — census 를 넓힐 때마다 두 언어를 함께 고쳐야 했고, 생성기가 따라가지 않아 생성물이 통째로 red 가 된
 * 적이 있다(2026-09-12 실측: 신설 136 · 누락 54 · 소멸 54). 이제 이 게이트는 그 도구의 {@code --check} 를 실행해 종료 코드와 완료 문장으로
 * 판정한다. 도구와 형식 모듈의 내용 해시가 매니페스트에 실리고({@code __registry.scripts/harness-baseline-manifest*.mjs}) 이 클래스의 본문도
 * {@code __sourceHash} 로 동결되므로, census 정의나 이 실행기를 약하게 고치면 매니페스트가 함께 바뀐다. 원본 CI·pre-push·재사용 생성물의
 * 하네스가 모두 이 경로이고, 늘 도는 운영 계약({@code scripts/harness-baseline-mirror-contract.test.mjs})이 같은 계산을 커밋본과 다시 대조한다.
 *
 * <p>Node 는 하네스의 필수 도구다({@code WorkflowManifestLinterTest} 도 생성물 CI 계약을 Node 로 실행한다). Node 부재·시간 초과·완료 문장
 * 부재는 fail-closed 다. Spring 컨텍스트를 띄우지 않는다.
 */
@Tag("governance-harness")
class HarnessBaselineIntegrityTest {

    private static final Logger log = LoggerFactory.getLogger(HarnessBaselineIntegrityTest.class);

    /** 매니페스트 계산·검사 도구(저장소 루트 상대). 재사용 생성물에도 같은 경로로 복사된다. */
    private static final String MANIFEST_TOOL = "scripts/harness-baseline-manifest.mjs";

    /** 도구가 대조를 끝까지 마쳤을 때만 내는 문장 — 종료 코드 0 하나로 통과를 판정하지 않는다(빈 실행의 false-green 차단). */
    private static final String CHECKED = "는 계산값과 같다(";

    private static final long TIMEOUT_SECONDS = 120;

    @Test
    @DisplayName("🧊 하네스 동결/예외 목록 무결성 — 게이트 무단 완화·신설 예외·게이트 삭제 차단")
    void auditHarnessBaselineIntegrity() throws IOException {
        Path root = HarnessSourceIndex.repoRoot();
        if (!Files.isRegularFile(root.resolve(MANIFEST_TOOL))) {
            fail("게이트 무결성 파손: 매니페스트 도구가 없습니다 — " + MANIFEST_TOOL + " (root=" + root
                    + "). 조용한 skip 은 false-green 입니다.");
        }
        Path output = Files.createTempFile("harness-baseline-", ".log");
        Process process = null;
        try {
            try {
                process = new ProcessBuilder("node", MANIFEST_TOOL, "--check").directory(root.toFile())
                        .redirectErrorStream(true).redirectOutput(output.toFile()).start();
            } catch (IOException e) {
                fail("게이트 무결성 파손: node 로 " + MANIFEST_TOOL + " 를 실행하지 못했습니다 — " + e.getMessage(), e);
            }
            if (!process.waitFor(TIMEOUT_SECONDS, TimeUnit.SECONDS)) {
                fail("게이트 무결성 파손: " + MANIFEST_TOOL + " --check 가 " + TIMEOUT_SECONDS + "초 안에 끝나지 않았습니다.");
            }
            String report = HarnessSourceIndex.readFresh(output).strip();
            if (process.exitValue() != 0) {
                fail(violationMessage(report));
            }
            if (!report.contains(CHECKED)) {
                fail("게이트 무결성 파손: " + MANIFEST_TOOL + " --check 가 0 으로 끝났지만 대조 완료 문장이 없습니다 — 빈 실행을 통과로 보지 않습니다.\n"
                        + report);
            }
            log.info("✅ 하네스 동결/예외 목록 무결성 OK — {}", report);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            fail("게이트 무결성 파손: " + MANIFEST_TOOL + " --check 실행이 중단됐습니다.", e);
        } finally {
            if (process != null && process.isAlive()) {
                process.destroyForcibly();
            }
            Files.deleteIfExists(output);
        }
    }

    private static String violationMessage(String report) {
        return "\n========================================================================\n"
                + "🧊 [HARNESS BASELINE INTEGRITY] 동결/예외 목록 무결성 위반이 차단되었습니다!\n"
                + "========================================================================\n"
                + report + "\n"
                + "\n💡 먼저 자문하십시오: 지금 목록을 손대는 이유가 '위반을 고치는 것' 입니까,\n"
                + "   아니면 '빨간 신호를 없애는 것' 입니까? 후자라면 그것은 수정이 아니라 은폐입니다.\n"
                + "   (AGENTS.md Evidence guardrails H2 / 오케스트레이션 프로토콜 §4.1 '미검증을 완료로 선언 금지')\n"
                + "\n💡 변경이 정당하다면:\n"
                + "   1) 사유를 커밋 메시지 또는 PR 설명에 남기고\n"
                + "   2) 저장소 루트에서 매니페스트를 다시 쓰고, 바뀐 키가 모두 정당한지 diff 로 확인하십시오.\n"
                + "      node " + MANIFEST_TOOL + " --write   (또는 npm run regen)\n"
                + "      (병합에서 같은 키가 충돌했으면 --keys <키…> 로 그 키의 계산값만 보고 그 값만 옮기십시오 — 통째로 다시 쓰지 않습니다, §6.4)\n";
    }
}
