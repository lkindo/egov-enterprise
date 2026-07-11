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
    @Size(max = 20)
    private String scrapId;
    @Size(max = 20)
    private String bbsId;
    @Size(max = 20)
    private String pstId;
    @Size(max = 100)
    private String scrapNm;
    @Size(max = 1000)
    private String scrapUrl;
    private String scrapExpln;
    @Size(max = 1)
    @NotBlank
    private String useYn;
    @Size(max = 20)
    @NotBlank
    private String userId; 
    private String frstRgtrId;
    private LocalDateTime crtDt;

    // 엔티티→DTO 매핑은 ScrapMapper (MapStruct, 프레임워크 표준) 로 이관됨.
}
