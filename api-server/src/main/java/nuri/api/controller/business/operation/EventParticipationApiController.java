package nuri.api.controller.business.operation;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import nuri.business.service.event.EventApplicationService;
import nuri.business.service.event.dto.EventApplicationDto;
import nuri.business.service.event.dto.OpenEventDto;
import nuri.foundation.core.response.ApiResponse;
import nuri.foundation.core.response.PageResponse;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * [V2_152] 사용자 행사 참가 신청. 신청자는 인증 주체(esntlId)로 고정한다 — 요청 본문으로 받지 않는다. 신청·취소는 행사 행을 잠근 뒤
 * 마감·정원·중복을 판정한다(서비스).
 */
@Tag(name = "Event Participation", description = "행사 조회·참가 신청·취소 API(사용자)")
@RestController
@RequestMapping("/api/v1/events")
@RequiredArgsConstructor
public class EventParticipationApiController {

    private final EventApplicationService applicationService;

    @Operation(summary = "신청 가능한 행사 목록",
            description = "마감일(없으면 행사 시작일)이 오늘이거나 그 뒤인 행사입니다. 정원·자리 수·신청을 받는지·내 신청 상태를 함께 싣습니다.")
    @GetMapping
    @PreAuthorize("@permissionPolicy.allowed(authentication, 'nuri.api.controller.business.operation.EventParticipationApiController#getOpenEvents')")
    public ResponseEntity<ApiResponse<PageResponse<OpenEventDto>>> getOpenEvents(
            @org.springframework.data.web.PageableDefault(size = 20) Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.success(PageResponse.of(applicationService.getOpenEvents(pageable))));
    }

    @Operation(summary = "행사 참가 신청",
            description = "현재 사용자로 신청합니다. 마감이 지났거나 정원이 찼으면 409(C014), 이미 신청·승인됐거나 반려된 신청이면 409(C008) 입니다. "
                    + "취소한 신청은 같은 신청을 다시 연다 — 새 자원을 만드는 생성형이 아니라 행위형 POST 라 200 입니다(ADR-0036, 커뮤니티 가입과 같다).")
    @PostMapping("/{evntSn}/applications")
    @PreAuthorize("@permissionPolicy.allowed(authentication, 'nuri.api.controller.business.operation.EventParticipationApiController#applyForEvent')")
    public ResponseEntity<ApiResponse<EventApplicationDto>> applyForEvent(@PathVariable Long evntSn) {
        return ResponseEntity.ok(ApiResponse.success(applicationService.apply(evntSn)));
    }

    @Operation(summary = "행사 참가 신청 취소",
            description = "내 신청(신청·승인)을 취소합니다. 행사가 이미 시작했으면 409, 신청 내역이 없으면 404 입니다.")
    @DeleteMapping("/{evntSn}/applications/me")
    @PreAuthorize("@permissionPolicy.allowed(authentication, 'nuri.api.controller.business.operation.EventParticipationApiController#cancelEventApplication')")
    public ResponseEntity<ApiResponse<Void>> cancelEventApplication(@PathVariable Long evntSn) {
        applicationService.cancel(evntSn);
        return ResponseEntity.ok(ApiResponse.success(null));
    }
}
