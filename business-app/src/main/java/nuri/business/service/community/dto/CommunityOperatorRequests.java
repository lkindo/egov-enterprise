package nuri.business.service.community.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/**
 * 커뮤니티 운영자 요청(GAP-CMTY-001, DEC-OPS-416). 컨트롤러는 api-server 에 있지만 요청 DTO 는 커뮤니티 기능 패키지에 둔다 —
 * 커뮤니티 기능이 빠진 생성물에 참조처 없이 남지 않게 한다(결재 임시저장 요청 선례).
 */
public final class CommunityOperatorRequests {

    private CommunityOperatorRequests() { }

    /** 운영자 지정·해제. 승인된 회원만 지정할 수 있고, 마지막 운영자는 해제할 수 없다. */
    @Schema(description = "커뮤니티 운영자 지정·해제")
    public record ManagerRequest(
            @Schema(description = "운영자로 지정하면 true, 해제하면 false") @NotNull Boolean manager) {
    }

    /** 운영자의 소개·기본 정보 수정. 사용 여부·템플릿은 관리자만 바꾼다. */
    @Schema(description = "커뮤니티 소개·기본 정보 수정(운영자)")
    public record ProfileRequest(
            @Schema(description = "커뮤니티 이름", maxLength = 300) @NotBlank @Size(max = 300) String cmntyNm,
            @Schema(description = "커뮤니티 소개", maxLength = 4000) @Size(max = 4000) String cmntyIntroCn,
            @Schema(description = "상세에서 읽은 커뮤니티 버전") @NotNull @Min(0) Integer version) {
    }
}
