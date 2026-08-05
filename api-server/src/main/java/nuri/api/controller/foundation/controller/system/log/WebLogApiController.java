package nuri.api.controller.foundation.controller.system.log;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import nuri.business.domain.common.BaseSearchDto;
import nuri.business.service.log.WebLogManageService;
import nuri.business.service.log.dto.WebLogDto;
import nuri.foundation.core.response.ApiResponse;
import nuri.foundation.core.response.PageResponse;
import nuri.foundation.security.annotation.AdminOrSystem;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * 웹 로그 조회 API (Admin).
 *
 * <p>[D-1 이행] 관리 화면 {@code /admin/system/logs/web} 은 이미 존재했고
 * {@code systemLogAdminService.getWebLogs()} 를 호출하고 있었으나 <b>대응 엔드포인트가 없었다</b>.
 * 그 사이 {@code tb_web_log} 에는 28,104행이 쌓여 있었다(2026-08-05 실측) — 수집은 되는데
 * 볼 수 없는 상태였다.
 *
 * <p><b>조회만 노출한다.</b> 적재는 {@code WebAuditLogListener}, 삭제는 보존기간 정책
 * ({@code LogRetentionScheduler})이 담당한다. 감사 로그를 관리자가 임의로 수정·삭제할 수 있으면
 * 증적으로서의 가치가 사라지므로 쓰기 엔드포인트를 두지 않는다.
 *
 * <p>인가는 {@code @AdminOrSystem} 을 <b>메서드에 직접</b> 붙인다. 이 경로는
 * {@code /api/v1/admin/**} 이라 {@code secure-paths} URL 인가로도 덮이지만, 그것은 목록 한 줄이
 * 빠지면 함께 사라지는 단일 실패점이다(백엔드 헌법 제8조 이중 검증).
 */
@Slf4j
@Tag(name = "WebLog", description = "웹 로그 조회 API (Admin)")
@RestController("systemWebLogApiController")
@RequestMapping("/api/v1/admin/system/logs/web")
@RequiredArgsConstructor
public class WebLogApiController {

    private final WebLogManageService webLogManageService;

    @Operation(summary = "웹 로그 목록 조회", description = "URL 부분일치 검색과 페이징을 지원한다.")
    @AdminOrSystem
    @GetMapping
    public ResponseEntity<ApiResponse<PageResponse<WebLogDto>>> getWebLogList(
            @ModelAttribute BaseSearchDto searchDto) {
        Page<WebLogDto> page = webLogManageService.selectWebLogList(searchDto);
        return ResponseEntity.ok(ApiResponse.success(PageResponse.of(page)));
    }
}
