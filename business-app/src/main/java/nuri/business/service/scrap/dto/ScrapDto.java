package nuri.business.service.scrap.dto;

import jakarta.validation.constraints.*;

import lombok.Builder;
import lombok.Getter;
import lombok.Setter;
import lombok.AllArgsConstructor;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;

/**
 * 스크랩 DTO (v5 standardized)
 */
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ScrapDto {
    private Long scrapSn;
    @Size(max = 20)
    private String bbsId;
    @Size(max = 20)
    private String pstId;
    @Size(max = 100)
    private String scrapNm;
    @Size(max = 1000)
    private String scrapUrl;
    private String scrapExpln;
    /** 사용여부. DB 체크제약(ck_tb_bbs_scrap_use_yn: 'Y'/'N')을 DTO 에 미러링한다. */
    @Size(max = 1)
    @NotBlank
    @Pattern(regexp = "[YN]", message = "사용여부는 Y 또는 N 이어야 합니다.")
    private String useYn;
    /**
     * 소유자(=frstRgtrId=loginId). <b>응답 전용 파생 필드</b>로, 요청 본문에서는 받지 않는다.
     * 등록/수정 시 소유자는 컨트롤러가 인증 주체(SecurityUtil.getCurrentLoginId)에서 주입하므로
     * 클라이언트에 입력을 강요하는 @NotBlank 는 두지 않는다(두면 정상 요청이 100% 400).
     */
    @Size(max = 20)
    private String userId;
    private String frstRgtrId;
    private LocalDateTime crtDt;

    // 엔티티↔DTO 매핑은 ScrapMapper (MapStruct, 프레임워크 표준) 가 전담한다 — ScrapService 가 이를 호출한다.
}
