package nuri.api.controller.business.file;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import nuri.business.service.file.AttachmentIntegrityService;
import nuri.business.service.file.dto.AttachmentIntegrityReport;
import nuri.foundation.core.response.ApiResponse;
import nuri.foundation.security.annotation.AdminOrSystem;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * 첨부 정합성 진단 (Admin).
 *
 * <p>[왜 있는가 — 2026-08-26]
 * DB 와 파일 저장소는 분리 운영하는 것이 정상이지만, 어긋났을 때 <b>알 방법이 없었다</b>. 실제로
 * 저장소에 실물이 없는 첨부를 사용자가 화면의 깨진 배너로 발견했다. 이 엔드포인트는 그 상태를
 * <b>사용자보다 먼저</b> 확인할 수 있게 한다.
 *
 * <p>드리프트는 정상 운영에서도 생긴다 — 저장소 경로 설정 변경, 다른 환경의 DB 를 붙임, 백업 복원
 * 시점 불일치, 스토리지 마이그레이션 중단.
 *
 * <p>⚠ <b>읽기 전용이다.</b> 어긋난 레코드를 지우는 기능은 두지 않는다 — 실물이 없는 이유가 "유실"
 * 일 수도 "저장소 설정이 잠깐 틀렸다" 일 수도 있는데, 후자에서 레코드를 지우면 복구 가능한 상황을
 * 복구 불가능하게 만든다. 판단과 조치는 사람이 한다.
 */
@Tag(name = "AttachmentIntegrity", description = "첨부 정합성 진단 API (Admin)")
@RestController
@RequestMapping("/api/v1/admin/files/integrity")
@RequiredArgsConstructor
public class AttachmentIntegrityApiController {

    private final AttachmentIntegrityService attachmentIntegrityService;

    /**
     * 전체 첨부 레코드와 저장소 실물을 대조한다.
     *
     * <p>[인가 — H3] 저장 경로가 응답에 포함되므로 목록 조회와 같은 ADMIN/SYSTEM 축으로 제한한다.
     * URL 게이트로도 덮이지만 그 목록 한 줄이 빠지면 함께 사라지는 단일 실패점이라
     * {@code @AdminOrSystem} 을 메서드에 직접 붙인다.
     */
    @Operation(summary = "첨부 정합성 점검",
            description = "DB 첨부 레코드와 저장소 실물을 대조해 어긋난 건수와 조치 대상 예시를 반환한다. "
                    + "읽기 전용이며 어떤 레코드도 변경하지 않는다.")
    @AdminOrSystem
    @GetMapping
    public ResponseEntity<ApiResponse<AttachmentIntegrityReport>> scan() {
        return ResponseEntity.ok(ApiResponse.success(attachmentIntegrityService.scan()));
    }
}
