package nuri.business.service.auth.dto;

import jakarta.validation.constraints.*;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * 롤 정보 DTO
 */
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Schema(description = "롤 관리 정보 DTO")
public class RoleManageDto {
    @Schema(description = "롤코드 (롤 ID)", example = "ROLE_USER")
    @Size(max = 20)
    private String roleId;
    
    @Schema(description = "롤명", example = "일반사용자 롤")
    @Size(max = 100)
    @NotBlank
    private String roleNm;
    
    /** 롤패턴 */
    @Schema(description = "롤패턴 (URL 또는 메소드)", example = "/admin/**")
    @Size(max = 300)
    private String rolePatrn;
    
    @Schema(description = "롤설명", example = "관리자 페이지 접근 제한 롤")
    @Size(max = 4000)
    private String roleExpln;
    
    @Schema(description = "롤유형", example = "url")
    @Size(max = 12)
    private String roleTypeCd;
    
    @Schema(description = "롤정렬순서", example = "1")
    private String roleSort;
    
    @Schema(description = "등록일시", example = "2026-05-25 20:46:00")
    private String crtDt;
}

