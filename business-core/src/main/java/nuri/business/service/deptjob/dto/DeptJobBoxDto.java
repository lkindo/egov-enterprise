package nuri.business.service.deptjob.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.*;

import nuri.business.domain.deptjob.DeptJobBox;
import lombok.*;
import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DeptJobBoxDto {

    @Schema(nullable = true, types = {"integer", "null"}, format = "int64",
            accessMode = Schema.AccessMode.READ_ONLY)
    @JsonProperty(access = JsonProperty.Access.READ_ONLY)
    private Long deptTaskBoxSn;
    @Size(max = 100)
    private String deptTaskBoxNm;
    @Size(max = 20)
    private String deptId;
    @Schema(nullable = true, types = {"string", "null"}, accessMode = Schema.AccessMode.READ_ONLY)
    @JsonProperty(access = JsonProperty.Access.READ_ONLY)
    private String deptNm;
    private Long sortOrdr;
    @Schema(nullable = true, types = {"string", "null"}, accessMode = Schema.AccessMode.READ_ONLY)
    @JsonProperty(access = JsonProperty.Access.READ_ONLY)
    private String frstRgtrId;
    @Schema(nullable = true, types = {"string", "null"}, format = "date-time",
            accessMode = Schema.AccessMode.READ_ONLY)
    @JsonProperty(access = JsonProperty.Access.READ_ONLY)
    private LocalDateTime crtDt;
    @Schema(nullable = true, types = {"string", "null"}, accessMode = Schema.AccessMode.READ_ONLY)
    @JsonProperty(access = JsonProperty.Access.READ_ONLY)
    private String lastMdfrId;
    @Schema(nullable = true, types = {"string", "null"}, format = "date-time",
            accessMode = Schema.AccessMode.READ_ONLY)
    @JsonProperty(access = JsonProperty.Access.READ_ONLY)
    private LocalDateTime mdfcnDt;

    public static DeptJobBoxDto fromEntity(DeptJobBox entity) {
        if (entity == null)
            return null;
        return DeptJobBoxDto.builder()
                .deptTaskBoxSn(entity.getDeptTaskBoxSn())
                .deptTaskBoxNm(entity.getDeptTaskBoxNm())
                .deptId(entity.getDeptId())
                .sortOrdr(entity.getSortOrdr())
                .frstRgtrId(entity.getFrstRgtrId())
                .crtDt(entity.getCrtDt())
                .lastMdfrId(entity.getLastMdfrId())
                .mdfcnDt(entity.getMdfcnDt())
                .build();
    }

    public DeptJobBox toEntity() {
        return DeptJobBox.builder()
                .deptTaskBoxSn(this.deptTaskBoxSn)
                .deptTaskBoxNm(this.deptTaskBoxNm)
                .deptId(this.deptId)
                .sortOrdr(this.sortOrdr)
                .build();
    }
}
