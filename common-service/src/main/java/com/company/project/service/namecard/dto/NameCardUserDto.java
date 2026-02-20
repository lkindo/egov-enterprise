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
@Schema(description = "Description")
public class NameCardUserDto {

    @Schema(description = "Description")
    private String ncrdId;

    @Schema(description = "Description")
    private String emplyrId;

    @Schema(description = "Description")
    private String creatDt;

    @Schema(description = "Description")
    private String registSeCode;

    @Schema(description = "Description")
    private String useAt;

    @Schema(description = "Description")
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

    // ?꾨씫??硫붿꽌?쒕뱾 異붽?
    public String getCreatDt() {
        return this.creatDt != null ? this.creatDt.toString() : null;
    }
}
