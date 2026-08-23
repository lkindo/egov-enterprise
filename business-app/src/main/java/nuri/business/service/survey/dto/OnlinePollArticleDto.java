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

    // DB 생성 PK — create/update 시 클라이언트가 알 수 없다(INSERT 시 BIGINT IDENTITY 채번).
    // 부모 OnlinePollManageDto.pollSn 과 동일한 사유로 @NotNull 을 걸지 않는다.
    // 부모에 @Valid 캐스케이드가 추가되면서 이 두 필드의 @NotBlank 가 표면화돼 설문 등록이 **항상**
    // 400(must not be blank ×2×항목수)으로 실패했다 — 관리 UI(SurveyManageCreateClient)도 동일하게
    // { pollArtclNm } 만 보내므로 어떤 클라이언트도 만족시킬 수 없는 계약이었다.
    // 이 DTO 를 inbound 로 받는 경로는 create/update 의 중첩 원소뿐이고(항목 목록 조회는 outbound),
    // 클라이언트가 이 ID 들을 전송하는 엔드포인트는 존재하지 않는다.
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
