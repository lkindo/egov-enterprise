package nuri.business.service.log;

import nuri.business.domain.common.BaseSearchDto;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * 로그 서비스가 화면이 보낸 조회 기간을 저장소까지 전달하는지 고정한다.
 *
 * <p>[무엇이 문제였나 — 2026-08-26 실측]
 * 사용자·웹·개인정보 로그 서비스는 저장소에 기간을 {@code null, null} 로 넘기고 있었다.
 * 주석은 "{@code BaseSearchDto} 에 기간 전용 필드가 없어서"라고 설명했지만 사실이 아니었다 —
 * {@code searchKeywordFrom}/{@code searchKeywordTo} 가 있었고 시스템 로그·로그인 로그 서비스는
 * 이미 그 필드를 기간 조건으로 쓰고 있었다.
 *
 * <p>결과는 <b>화면이 보낸 기간이 서비스 계층에서 조용히 사라지는 것</b>이다. 저장소도 컨트롤러도
 * 기간을 지원하는데 가운데 한 층이 버려서, 사용자는 기간을 좁혔다고 믿고 전체 결과를 본다.
 * 감사 조회에서 이 오해는 잘못된 결론으로 직결된다.
 *
 * <p>⚠ 이 테스트는 <b>소스를 읽어</b> 전달 여부를 본다. 저장소 호출 인자를 런타임으로 확인하려면
 * 5개 서비스마다 스프링 컨텍스트나 목을 세워야 하는데, 여기서 지키려는 것은 "이 한 줄이 다시
 * {@code null} 로 돌아가지 않는 것"이라 소스 수준 고정이 목적에 정확히 맞는다.
 */
@DisplayName("로그 서비스 기간 전달 계약")
class LogPeriodForwardingTest {

    private static final Path SERVICE_DIR =
            Path.of("src", "main", "java", "nuri", "business", "service", "log");

    private static final List<String> SERVICES = List.of(
            "LogManageService.java",
            "LoginLogManageService.java",
            "UserLogManageService.java",
            "WebLogManageService.java",
            "PrivacyLogManageService.java");

    private static String read(String fileName) throws IOException {
        return Files.readString(SERVICE_DIR.resolve(fileName), StandardCharsets.UTF_8);
    }

    @Test
    @DisplayName("다섯 서비스 모두 검색 기간을 저장소로 넘긴다")
    void forwardsPeriodToRepository() throws IOException {
        for (String service : SERVICES) {
            String source = read(service);
            assertThat(source)
                    .as("%s 가 기간 시작을 전달하지 않습니다", service)
                    .contains("getSearchKeywordFrom()");
            assertThat(source)
                    .as("%s 가 기간 종료를 전달하지 않습니다", service)
                    .contains("getSearchKeywordTo()");
        }
    }

    @Test
    @DisplayName("기간 자리에 null 을 넘기는 호출이 되살아나지 않는다")
    void doesNotDropPeriod() throws IOException {
        for (String service : SERVICES) {
            assertThat(read(service))
                    .as("%s 가 기간을 버리고 있습니다 — 화면이 좁힌 조건이 조용히 사라진다", service)
                    .doesNotContain("null, null, pageable");
        }
    }

    @Test
    @DisplayName("BaseSearchDto 가 기간 필드를 실제로 갖고 있다")
    void baseSearchDtoHasPeriodFields() {
        // 위 두 테스트가 소스 문자열을 보므로, 그 필드가 실존한다는 사실은 타입으로 확인한다.
        BaseSearchDto dto = new BaseSearchDto();
        dto.setSearchKeywordFrom("20260801");
        dto.setSearchKeywordTo("20260826");

        assertThat(dto.getSearchKeywordFrom()).isEqualTo("20260801");
        assertThat(dto.getSearchKeywordTo()).isEqualTo("20260826");
    }
}
