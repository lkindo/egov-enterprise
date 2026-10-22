package nuri.business.service.cms.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/** 업무 홈 소개 지정 요청(ADR-0039 결정 2). 비우면 지정을 해제한다. 버전은 홈 설정의 버전이다(페이지 버전과 따로 센다). */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Schema(description = "업무 홈 맨 위에 보일 게시 페이지 지정 요청")
public class CmsHomeUpdateRequest {

    @Schema(description = "지정할 콘텐츠 일련번호. 비우면 지정을 해제한다", nullable = true)
    private Long contsSn;

    @Schema(description = "화면이 읽은 홈 설정 버전")
    @NotNull
    private Integer version;
}
