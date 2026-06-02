package nuri.business.service.usermanagement.dto;

import jakarta.validation.constraints.*;
import nuri.business.domain.user.entity.DeptManage;
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

    @NotBlank
    @Size(max = 20)
    @Schema(description = "부서 ID")
    private String orgnztId;

    @NotBlank
    @Size(max = 100)
    @Schema(description = "부서 명")
    private String orgnztNm;

    @Size(max = 4000)
    @Schema(description = "부서 설명")
    private String orgnztDc;

    @Schema(description = "등록자 ID")
    private String frstRgtrId;

    @Schema(description = "등록 일시")
    private LocalDateTime crtDt;

    public static DeptManageDto from(DeptManage entity) {
        if (entity == null)
            return null;
        return DeptManageDto.builder()
                .orgnztId(entity.getOrgnztId())
                .orgnztNm(entity.getOrgnztNm())
                .orgnztDc(entity.getOrgnztDc())
                .frstRgtrId(entity.getFrstRgtrId())
                .crtDt(entity.getCrtDt())
                .build();
    }
}
