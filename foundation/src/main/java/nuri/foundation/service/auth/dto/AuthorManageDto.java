package nuri.foundation.service.auth.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.springframework.lang.NonNull;

/**
 * 권한 정보 DTO
 */
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Schema(description = "권한 관리 정보 DTO")
public class AuthorManageDto {
    /** 권한코드 */
    @Schema(description = "권한코드", example = "ROLE_USER")
    @NotBlank(message = "권한코드는 필수 입력 사항입니다.")
    @Size(max = 30)
    @NonNull
    private String authrtCd;

    /** 권한명 */
    @Schema(description = "권한명", example = "일반사용자")
    @NotBlank(message = "권한명은 필수 입력 사항입니다.")
    @Size(max = 60)
    @NonNull
    private String authrtNm;

    /** 권한설명 */
    @Schema(description = "권한설명", example = "일반 사용자 기본 권한")
    @Size(max = 200)
    private String authrtExpln;

    /** 권한생성일 */
    @Schema(description = "권한생성일자", example = "2026-05-25")
    private String authrtCrtYmd;
}

