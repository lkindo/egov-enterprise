package nuri.business.service.system.service.survey.dto;

import jakarta.validation.constraints.*;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Schema(description = "온라인 설문 항목 DTO (표준화)")
public class OnlinePollArticleDto {

    @Schema(description = "설문 항목 ID")
    @Size(max = 20)
    @NotBlank
    private String pollArtclId;

    @Schema(description = "설문 ID")
    @Size(max = 20)
    @NotBlank
    private String pollId;

    @Schema(description = "설문 항목 명")
    @Size(max = 100)
    @NotBlank
    private String pollArtclNm;

    @Schema(description = "투표 수")
    private Long pollIemCo;

    @Schema(description = "생성자 ID")
    private String frstRgtrId;

    @Schema(description = "생성 일시")
    private LocalDateTime crtDt;

    // entity→DTO 매핑은 프레임워크 표준 OnlinePollArticleMapper.toDto() 로 단일화한다.
    // (수기 from() 은 Mapper 와 이중매핑되어 드리프트 위험이 있어 제거함 — ProgramDto.from 제거 선례와 동일.)
}
