package com.company.project.service.namecard.dto;

import com.company.project.domain.namecard.NameCard;
import com.company.project.domain.namecard.NameCardUser;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Schema(description = "명함 사용 정보 DTO")
public class NameCardUserDto {

    @Schema(description = "명함 ID")
    private String ncrdId;

    @Schema(description = "사용자 ID")
    private String emplyrId;

    @Schema(description = "등록일시")
    private String creatDt;

    @Schema(description = "등록구분코드")
    private String registSeCode;

    @Schema(description = "사용여부")
    private String useAt;

    @Schema(description = "명함 정보")
    private NameCardDto nameCard;

    public static NameCardUserDto from(NameCardUser entity, NameCard nameCard) {
        return NameCardUserDto.builder()
                .ncrdId(entity.getNcrdId())
                .emplyrId(entity.getEmplyrId())
                .creatDt(entity.getCreatDt())
                .registSeCode(entity.getRegistSeCode())
                .useAt(entity.getUseAt())
                .nameCard(NameCardDto.from(nameCard))
                .build();
    }

    // 누락된 메서드들 추가
    public String getCreatDt() {
        return this.creatDt != null ? this.creatDt.toString() : null;
    }
}
