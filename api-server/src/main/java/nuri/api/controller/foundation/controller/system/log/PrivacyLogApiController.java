package nuri.api.controller.foundation.controller.system.log;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import nuri.business.domain.common.BaseSearchDto;
import nuri.business.service.log.PrivacyLogManageService;
import nuri.business.service.log.dto.PrivacyLogDto;
import nuri.foundation.core.response.ApiResponse;
import nuri.foundation.core.response.PageResponse;
import nuri.foundation.security.annotation.AdminOnly;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * 개인정보 조회 로그 열람 API (Admin 전용).
 *
 * <p>[D-1 이행] 관리 화면 {@code /admin/system/logs/privacy} 는 이미 존재했고
 * {@code systemLogAdminService.getPrivacyLogs()} 를 호출하고 있었으나 대응 엔드포인트가 없었다.
 * <b>볼 수 없는 증적은 증적이 아니다</b>.
 *
 * <p><b>⚠ 인가를 다른 로그보다 좁혔다 — {@code @AdminOnly}({@code hasRole('ADMIN')}).</b>
 * 웹·시스템·로그인 로그가 쓰는 {@code @AdminOrSystem} 은 SYSTEM 롤도 통과시키지만 여기는 제외한다.
 * 이 로그의 내용 자체가 개인정보이기 때문이다 — {@code inqInfo}(조회 대상 정보) ·
 * {@code dmndUserId}(조회자) · {@code dmndUserIpAddr}(조회자 IP)가 모두 식별 가능한 값이라,
 * "개인정보 접근 기록을 누가 볼 수 있는가" 가 그 자체로 개인정보 이슈다.
 * (2026-08-05 사용자 결정: "개인정보 로그는 관리자 권한만 볼 수 있게".)
 *
 * <p><b>조회만 노출한다.</b> 적재는 개인정보 접근 지점이, 삭제는 보존기간 정책
 * ({@code LogRetentionScheduler})이 담당한다. 증적을 열람자가 수정·삭제할 수 있으면 증적이 아니다.
 */
@Slf4j
@Tag(name = "PrivacyLog", description = "개인정보 조회 로그 열람 API (Admin 전용)")
@RestController("systemPrivacyLogApiController")
@RequestMapping("/api/v1/admin/system/logs/privacy")
@RequiredArgsConstructor
public class PrivacyLogApiController {

    private final PrivacyLogManageService privacyLogManageService;

    @Operation(summary = "개인정보 조회 로그 목록",
            description = "조회 대상 정보 부분일치 검색과 페이징을 지원한다. ADMIN 롤 전용이다.")
    @AdminOnly
    @GetMapping
    public ResponseEntity<ApiResponse<PageResponse<PrivacyLogDto>>> getPrivacyLogList(
            @ModelAttribute BaseSearchDto searchDto) {
        Page<PrivacyLogDto> page = privacyLogManageService.selectPrivacyLogList(searchDto);
        return ResponseEntity.ok(ApiResponse.success(PageResponse.of(page)));
    }
}
