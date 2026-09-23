package nuri.business.service.program.dto;

import jakarta.validation.constraints.*;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Schema(description = "프로그램 정보 DTO")
public class ProgramDto {
    /** 등록은 클라이언트 키가 필요하고 수정은 URL 경로의 키를 사용한다. */
    public interface OnCreate {}

    /*
      [2026-09-23 springdoc 2.8.5 → 2.9.1] requiredMode 를 명시한다.

      OpenAPI 스키마에는 Bean Validation 의 group 개념이 없다 — 하나의 스키마가 "등록에서는 필수, 수정에서는
      선택" 을 동시에 말할 수 없다. springdoc 2.8.5 는 group 한정 @NotBlank 도 required 로 방출했고 2.9.1 은
      Lombok 클래스에서 그것을 멈췄다(record 인 UserDto.pswd 는 여전히 방출된다 — springdoc 내부 경로가 다르다).

      생성 계약과 관리자 폼은 그동안 이 필드를 **양쪽 경로 모두에서 필수**로 다뤄 왔다(ProgramForm 이
      `ProgramDtoSchema.shape.prgrmFileNm.min(1)` 을 직접 부른다 — optional 이 되면 타입 검사가 깨진다).
      그 읽기를 유지하되, springdoc 의 내부 동작에 기대지 않도록 여기서 명시한다. 런타임 group 의미는 불변이다
      — 수정(PUT)은 @Valid 만 쓰므로 이 @NotBlank 가 발화하지 않는다.
    */
    @Schema(description = "프로그램 파일 명칭", requiredMode = Schema.RequiredMode.REQUIRED)
    @Size(max = 300)
    @NotBlank(groups = OnCreate.class)
    private String prgrmFileNm;

    @Schema(description = "프로그램 저장 경로")
    @Size(max = 1000)
    private String prgrmStrgPath;

    @Schema(description = "프로그램 한글 명칭")
    @Size(max = 100)
    private String prgrmKornNm;

    @Schema(description = "프로그램 URL")
    @Size(max = 1000)
    private String url;

    @Schema(description = "프로그램 설명")
    @Size(max = 4000)
    private String prgrmExpln;

    // 수기 from() 은 ProgramMapper(componentModel=spring)로 완전 대체되어 제거됨.
    // 유일 호출자였던 MenuService.getAllPrograms() 도 programMapper::toDto 로 전환.
}
