package nuri.api.harness;

import nuri.api.schema.SharedPostgresMigrationTestSupport;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.mockito.MockedConstruction;
import org.testcontainers.postgresql.PostgreSQLContainer;

import java.io.IOException;
import java.lang.reflect.InvocationTargetException;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.regex.Pattern;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Answers.RETURNS_SELF;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mockConstruction;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.withSettings;

/** PostgreSQL migration suite의 공유 서버·격리 database 구조를 보호하는 governance gate. */
@Tag("governance-harness")
class SharedPostgresMigrationHarnessContractTest {

    /**
     * 공용 PostgreSQL support 로 이관해야 하는 migration 검증 클래스 수(동결).
     *
     * <p>[2026-09-01] 종전에는 이름 없는 매직 리터럴({@code hasSize(35)})이라 무엇을 세는 수인지
     * 호출부에서만 알 수 있었다. 파생값으로 바꾸지 않는 이유는 이 수가 <b>동결</b>이기 때문이다 —
     * 자동으로 세면 신규 migration 검증이 공용 support 를 쓰지 않아도 census 가 조용히 따라 올라간다.
     * 정당한 증감은 이 상수를 함께 고쳐 diff 에 의도를 남긴다.
     */
    // V2_100: 같은 공용 support에서 메뉴 노출 동등성·감사 롤백·Contract 순서 검증을 추가한다.
    // V2_101: 기존 단일 결재의 차수/참여자 백필 검증도 같은 공용 support를 사용한다.
    // V2_102: 빈 문자열 부모를 NULL 로 정규화한 뒤 참조 FK 를 검증하는 이력 검증을 추가한다.
    // V2_104: 퇴역한 네트워크 권한 배정의 삭제와 변경 이력 검증을 추가한다.
    // V2_105: 게시글 작성일 인덱스의 잠금 경합 롤백과 기간 질의 실행 계획 검증을 추가한다.
    // V2_106: 원문 리프레시 토큰 폐기와 해시 저장값 수용 검증을 추가한다.
    // V2_107: 추천 이력 PK·만족도 1인 1건과 중복이 있을 때 멈추는 검증을 추가한다.
    // V2_109: 기존 게시판의 댓글·만족도 설정을 실제 동작대로 켜는 검증을 추가한다.
    // V2_111: 폐기된 게시글 비밀번호 값만 비우는 검증을 추가한다.
    // V2_119: 화면 관리 메뉴 개명과 시드 유래 미참조 이전 프로그램만 지우는 검증을 추가한다.
    // V2_120: ROLE_USER 의 들어갈 수 없는 설문·투표 관리 메뉴 배정만 지우는 검증을 추가한다.
    // V2_124: 퇴역한 프로그램 목록 권한 배정의 삭제·이력과 갈 곳 잃는 말단 메뉴 가드 검증을 추가한다.
    // V2_125: 꺼진 마이페이지 관리 메뉴 행·배정·즐겨찾기 삭제와 이력, 도입 기관이 쓰는 행을 남기는 가드 검증을 추가한다.
    private static final int EXPECTED_MIGRATION_TEST_COUNT = 57;

    @Test
    @DisplayName("격리 database 이름은 병렬 클래스마다 고유하고 PostgreSQL 식별자 한도 안에서 안전하다")
    void isolatedDatabaseNamesAreSafeAndCollisionFree() {
        String first = SharedPostgresMigrationTestSupport.databaseNameFor(
                "InternetServiceGuidanceBigintMigrationIntegrationTest", "run-1");
        String second = SharedPostgresMigrationTestSupport.databaseNameFor(
                "InternetServiceGuidanceBigintMigrationIntegrationTest", "run-2");

        assertThat(first).matches("[a-z0-9_]+").hasSizeLessThanOrEqualTo(63);
        assertThat(second).matches("[a-z0-9_]+").hasSizeLessThanOrEqualTo(63);
        assertThat(first).isNotEqualTo(second);
        assertThat(first).doesNotContain("-", "\"", "'");

        assertThatThrownBy(() -> SharedPostgresMigrationTestSupport.databaseNameFor("Test", "x".repeat(64)))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("식별자 한도");
    }

    @Test
    void sharedServerStartFailureStopsItsOwnedContainerAndPreservesTheFailure() throws Exception {
        int startsBefore = sharedServerStartCount();
        RuntimeException startFailure = new IllegalStateException("synthetic container start failure");
        var start = SharedPostgresMigrationTestSupport.class.getDeclaredMethod("startSharedServer");
        start.setAccessible(true);

        try (MockedConstruction<PostgreSQLContainer> construction = mockConstruction(
                PostgreSQLContainer.class, withSettings().defaultAnswer(RETURNS_SELF),
                (container, context) -> doThrow(startFailure).when(container).start())) {
            InvocationTargetException wrapper = assertThrows(InvocationTargetException.class, () -> start.invoke(null));

            assertThat(wrapper.getCause()).isSameAs(startFailure);
            assertThat(startFailure.getSuppressed()).isEmpty();
            assertThat(construction.constructed()).hasSize(1);
            PostgreSQLContainer owned = construction.constructed().getFirst();
            verify(owned).start();
            verify(owned).stop();
            assertThat(sharedServerStartCount()).isEqualTo(startsBefore);
        }
    }

    @Test
    void sharedServerCleanupFailureIsSuppressedWithoutReplacingTheStartFailure() throws Exception {
        int startsBefore = sharedServerStartCount();
        RuntimeException startFailure = new IllegalStateException("synthetic container start failure");
        RuntimeException cleanupFailure = new IllegalStateException("synthetic container cleanup failure");
        var start = SharedPostgresMigrationTestSupport.class.getDeclaredMethod("startSharedServer");
        start.setAccessible(true);

        try (MockedConstruction<PostgreSQLContainer> construction = mockConstruction(
                PostgreSQLContainer.class, withSettings().defaultAnswer(RETURNS_SELF), (container, context) -> {
                    doThrow(startFailure).when(container).start();
                    doThrow(cleanupFailure).when(container).stop();
                })) {
            InvocationTargetException wrapper = assertThrows(InvocationTargetException.class, () -> start.invoke(null));

            assertThat(wrapper.getCause()).isSameAs(startFailure);
            assertThat(startFailure.getSuppressed()).containsExactly(cleanupFailure);
            assertThat(construction.constructed()).hasSize(1);
            PostgreSQLContainer owned = construction.constructed().getFirst();
            verify(owned).start();
            verify(owned).stop();
            assertThat(sharedServerStartCount()).isEqualTo(startsBefore);
        }
    }

    private static int sharedServerStartCount() throws ReflectiveOperationException {
        var field = SharedPostgresMigrationTestSupport.class.getDeclaredField("SERVER_START_COUNT");
        field.setAccessible(true);
        return ((AtomicInteger) field.get(null)).get();
    }

    @Test
    @DisplayName("57개 migration 검증은 개별 container lifecycle 없이 공용 PostgreSQL support를 사용한다")
    void migrationTestsUseSharedPostgresSupport() throws IOException {
        List<Path> migrationTests = HarnessSourceIndex.javaSources(schemaSourceRoot()).stream()
                .filter(SharedPostgresMigrationHarnessContractTest::isMigrationTest)
                .sorted()
                .toList();

        assertThat(migrationTests)
                .as("공용 서버로 이관해야 하는 migration 검증 클래스 census(동결 %d)"
                        .formatted(EXPECTED_MIGRATION_TEST_COUNT))
                .hasSize(EXPECTED_MIGRATION_TEST_COUNT);

        Pattern directLifecycle = Pattern.compile(
                "(?m)^import org\\.testcontainers|^\\s*@(?:Testcontainers|Container)\\b|new PostgreSQLContainer|\\bPOSTGRES\\.");
        List<String> violations = new ArrayList<>();
        for (Path source : migrationTests) {
            String code = HarnessSourceIndex.read(source);
            String name = source.getFileName().toString();
            if (!code.contains("extends SharedPostgresMigrationTestSupport")) {
                violations.add(name + ": shared support 상속 누락");
            }
            if (directLifecycle.matcher(code).find()) {
                violations.add(name + ": 개별 Testcontainers lifecycle/credential 참조 잔존");
            }
        }

        assertThat(violations)
                .as("migration 클래스마다 PostgreSQLContainer를 다시 띄우면 49회 부팅으로 회귀한다")
                .isEmpty();
    }

    private static boolean isMigrationTest(Path path) {
        String name = path.getFileName().toString();
        return name.endsWith("MigrationIntegrationTest.java");
    }

    private static Path schemaSourceRoot() {
        return HarnessSourceIndex.repoRoot().resolve("api-server/src/test/java/nuri/api/schema");
    }
}
