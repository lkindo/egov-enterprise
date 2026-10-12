package nuri.business.service.community.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import java.util.List;

/**
 * 커뮤니티 관리 창의 템플릿 후보(Phase 2 커뮤니티 후속 C2, DEC-OPS-280).
 *
 * <p>템플릿 기능은 커뮤니티의 선택 연동이다. 이 구성에 템플릿 기능이 없으면 {@code available=false} 이고 후보는 비어 있다 —
 * 화면은 템플릿 칸을 그리지 않고 기존 값을 그대로 보낸다. 후보는 사용 중인 항목만이다(새 지정은 사용 중인 항목만 받는다).
 */
@Schema(description = "커뮤니티 템플릿 후보")
public record CommunityTemplateOptionsDto(
        @Schema(description = "이 구성에 템플릿 기능이 있는지") boolean available,
        @Schema(description = "새로 지정할 수 있는 사용 중 템플릿. 템플릿 기능이 없으면 빈 목록") List<CommunityTemplateOptionDto> templates) {

    /** 템플릿 기능이 없는 구성. */
    public static CommunityTemplateOptionsDto unavailable() {
        return new CommunityTemplateOptionsDto(false, List.of());
    }

    /** 템플릿 후보 한 건. */
    @Schema(description = "커뮤니티 템플릿 후보 한 건")
    public record CommunityTemplateOptionDto(
            @Schema(description = "템플릿 ID") String tmpltId,
            @Schema(description = "템플릿 이름", nullable = true) String tmpltNm) {
    }
}
