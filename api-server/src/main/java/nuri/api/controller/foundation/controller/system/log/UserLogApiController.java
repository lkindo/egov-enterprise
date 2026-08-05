package nuri.api.controller.foundation.controller.system.log;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import nuri.business.domain.common.BaseSearchDto;
import nuri.business.service.log.UserLogManageService;
import nuri.business.service.log.dto.UserLogDto;
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
 * 사용자 활동 로그 조회 API (Admin).
 *
 * <p>[D-1 이행] 관리 화면 {@code /admin/system/logs/user} 는 이미 존재했고
 * {@code systemLogAdminService.getUserLogs()} 를 호출하고 있었으나 대응 엔드포인트가 없었다.
 *
 * <p>이 로그는 <b>사용자 × 서비스 × 메서드 × 일자 단위 집계</b>이며 값의 본체는 행위 카운터
 * 6종(생성·수정·조회·삭제·출력·오류)이다. 개별 요청 추적이 아니므로 개인정보 로그
 * ({@code @AdminOnly})보다는 넓은 {@code @AdminOrSystem} 을 쓴다 — 웹·시스템·로그인 로그와 동일 등급이다.
 *
 * <p><b>조회만 노출한다.</b> 적재는 활동 집계 지점이, 삭제는 보존기간 정책과 회원 탈퇴 정리가
 * 담당한다. 감사 성격의 기록을 관리자가 임의로 수정·삭제할 수 있으면 증적 가치가 사라진다.
 */
@Slf4j
@Tag(name = "UserLog", description = "사용자 활동 로그 조회 API (Admin)")
@RestController("systemUserLogApiController")
@RequestMapping("/api/v1/admin/system/logs/user")
@RequiredArgsConstructor
public class UserLogApiController {

    private final UserLogManageService userLogManageService;

    @Operation(summary = "사용자 활동 로그 목록",
            description = "사용자명 부분일치 검색과 페이징을 지원한다. 검색 대상은 연관 사용자의 이름이다.")
    @AdminOrSystem
    @GetMapping
    public ResponseEntity<ApiResponse<PageResponse<UserLogDto>>> getUserLogList(
            @ModelAttribute BaseSearchDto searchDto) {
        Page<UserLogDto> page = userLogManageService.selectUserLogList(searchDto);
        return ResponseEntity.ok(ApiResponse.success(PageResponse.of(page)));
    }
}
