package nuri.business.service.survey.dto;

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

    // 신규 항목은 INSERT 시 BIGINT IDENTITY로 채번하므로 ID를 생략한다.
    // 기존 항목 수정은 조회 응답의 pollArtclSn으로 항목을 식별한다.
    // pollSn은 부모 DTO에서 결정하며, 항목에 전달된 경우 같은 설문인지 서비스에서 검증한다.
    // 생성과 수정을 함께 사용하는 DTO이므로 두 ID에 @NotNull을 선언하지 않는다.
    @Schema(description = "설문 항목 일련번호")
    private Long pollArtclSn;

    @Schema(description = "설문 일련번호")
    private Long pollSn;

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
