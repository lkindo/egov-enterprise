package nuri.business.service.help.dto;

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
@Schema(description = "Description")
public class HpcmDto {

    @Schema(description = "도움말 일련번호", example = "1")
    private Long hlpSn;

    @NotBlank
    @Size(max = 3)
    @Schema(description = "도움말 구분코드")
    private String hlpSeCd;

    @NotBlank
    @Size(max = 1000)
    @Schema(description = "도움말 정의")
    private String hlpDfn;

    @NotBlank
    // [2026-09-02] 65535 → 4000. 물리 컬럼은 V2_19 에서 text → varchar(4000) 으로 좁혀졌는데 DTO 가
    //   따라오지 않아, 4001~65535자 입력이 Bean Validation 을 통과한 뒤 DB 제약 위반으로 500 이 났다.
    //   화면(HpcmClient)은 이미 4000 으로 조여 관리자 UI 는 막았지만, 계약(api-docs·generated-zod)은
    //   65535 를 공표하고 있었다 — 계약이 물리 스키마와 어긋나면 UI 를 우회한 호출이 500 을 만난다.
    @Size(max = 4000)
    @Schema(description = "도움말 설명")
    private String hlpExpln;

    @Schema(description = "Description")
    private String frstRgtrId;

    @Schema(description = "Description")
    private LocalDateTime crtDt;

    // 엔티티→DTO 매핑은 HpcmMapper(MapStruct) 로 이관 (프레임워크 표준). 수기 from() 폐지.
}
