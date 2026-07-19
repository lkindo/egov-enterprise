package nuri.business.service.department.dto;

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
@Schema(description = "부서 정보 DTO")
public class DeptManageDto {

    /**
     * 부서 ID. 등록(POST) 시에는 보내지 않는다 — 서버가 채번한다.
     * 종전에는 @NotBlank 였는데 등록 폼이 이 값을 수집하지 않아 부서 등록이 항상 400 이었다.
     * 수정(PUT)·삭제는 경로변수로 대상을 지정하므로 본문 필수성은 필요하지 않다.
     */
    @Size(max = 20)
    @Schema(description = "부서 ID (등록 시 서버 채번)")
    private String ognzId;

    @NotBlank
    @Size(max = 100)
    @Schema(description = "부서 명")
    private String ognzNm;

    @Size(max = 4000)
    @Schema(description = "부서 설명")
    private String ognzExpln;

    @Size(max = 20)
    @Schema(description = "상위 부서 ID (NULL 이면 최상위)")
    private String upOgnzId;

    @Schema(description = "동일 상위 내 정렬 순서")
    private Integer sortOrdr;

    @Schema(description = "등록자 ID")
    private String frstRgtrId;

    @Schema(description = "등록 일시")
    private LocalDateTime crtDt;
}
