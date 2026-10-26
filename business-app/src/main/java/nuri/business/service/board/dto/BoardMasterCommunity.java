package nuri.business.service.board.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import io.swagger.v3.oas.annotations.media.Schema;
import nuri.foundation.core.community.CommunityBoardAccessPort;
import org.jspecify.annotations.Nullable;

/**
 * 게시판이 귀속된 커뮤니티의 요약 — 게시판 운영 화면(목록·상세)이 이용 범위와 공개 준비의 입구를 판정할 때 쓴다.
 *
 * <p>[2026-10-26 ADR-0043 결정 3] 귀속 게시판의 입구는 커뮤니티 화면이다. 귀속 커뮤니티가 사용 중지면 입구가 없다. 이름·이용 가능
 * 여부는 커뮤니티 기능이 foundation 포트({@code CommunityBoardAccessPort#summary})로 알려 준다 — 게시판 저장소는 커뮤니티 표를
 * 직접 읽지 않는다(GAP-ARCH-001). 커뮤니티 기능이 없거나 커뮤니티를 찾지 못하면 이름과 이용 가능 여부는 {@code null}(확인 불가)이다.
 * 화면은 이것을 입구가 있다고 추정하지 않는다.
 */
@Schema(description = "게시판이 귀속된 커뮤니티 요약. 이름·이용 가능 여부를 알 수 없으면(커뮤니티 기능 없음·찾지 못함) 둘 다 null 이다")
@JsonInclude(JsonInclude.Include.ALWAYS)
public record BoardMasterCommunity(
        @Schema(description = "커뮤니티 일련번호", requiredMode = Schema.RequiredMode.REQUIRED) Long cmntySn,
        @Schema(description = "커뮤니티 이름. 알 수 없으면 null", requiredMode = Schema.RequiredMode.REQUIRED,
                nullable = true, types = {"string", "null"}) String cmntyNm,
        @Schema(description = "이용자가 커뮤니티 화면을 열 수 있는지(사용 중이고 정식 등록). 알 수 없으면 null",
                requiredMode = Schema.RequiredMode.REQUIRED, nullable = true, types = {"boolean", "null"}) Boolean inUse) {

    /** 이름·이용 가능 여부를 알 수 없는 요약(확인 불가). */
    public static BoardMasterCommunity unknown(Long cmntySn) {
        return new BoardMasterCommunity(cmntySn, null, null);
    }

    /**
     * 귀속 번호의 요약. 귀속이 없으면 {@code null} 이다. 커뮤니티 기능이 없거나(포트 없음) 커뮤니티를 찾지 못하면 확인 불가 요약이다 —
     * 운영 화면(마스터 응답)과 이용자 메타가 같은 판정을 쓴다.
     */
    public static @Nullable BoardMasterCommunity of(@Nullable Long cmntySn, @Nullable CommunityBoardAccessPort port) {
        if (cmntySn == null) {
            return null;
        }
        if (port == null) {
            return unknown(cmntySn);
        }
        return port.summary(cmntySn)
                .map(summary -> new BoardMasterCommunity(cmntySn, summary.cmntyNm(), summary.inUse()))
                .orElseGet(() -> unknown(cmntySn));
    }
}
