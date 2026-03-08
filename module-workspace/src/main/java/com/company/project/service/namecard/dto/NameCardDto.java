package com.company.project.service.namecard.dto;

import com.company.project.domain.namecard.NameCard;
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
@Schema(description = "명함 정보 DTO")
public class NameCardDto {

    @Schema(description = "명함 ID")
    private String ncrdId;

    @Schema(description = "이름")
    private String name;

    @Schema(description = "회사명")
    private String companyName;

    @Schema(description = "부서명")
    private String departmentName;

    @Schema(description = "직급명")
    private String rankName;

    @Schema(description = "직위명")
    private String positionName;

    @Schema(description = "이메일주소")
    private String emailAddress;

    @Schema(description = "전화번호")
    private String telNumber;

    @Schema(description = "휴대폰번호")
    private String mobileNumber;

    @Schema(description = "주소")
    private String address;

    @Schema(description = "상세주소")
    private String detailAddress;

    @Schema(description = "우편번호")
    private String zipCode;

    @Schema(description = "비고")
    private String remark;

    @Schema(description = "공개여부 (Y/N)")
    private String isPublic;

    @Schema(description = "명함 대상자 ID")
    private String targetUserId;

    @Schema(description = "외부인여부 (Y/N)")
    private String isExternalUser;

    @Schema(description = "최초등록자 ID")
    private String firstRegisterId;

    @Schema(description = "생성일시")
    private LocalDateTime createdDate;

    public static NameCardDto from(NameCard entity) {
        if (entity == null)
            return null;
        return NameCardDto.builder()
                .ncrdId(entity.getNcrdId())
                .name(entity.getName())
                .companyName(entity.getCompanyName())
                .departmentName(entity.getDepartmentName())
                .rankName(entity.getRankName())
                .positionName(entity.getPositionName())
                .emailAddress(entity.getEmailAddress())
                .telNumber(entity.getTelNumber())
                .mobileNumber(entity.getMobileNumber())
                .address(entity.getAddress())
                .detailAddress(entity.getDetailAddress())
                .zipCode(entity.getZipCode())
                .remark(entity.getRemark())
                .isPublic(entity.getIsPublic())
                .targetUserId(entity.getTargetUserId())
                .isExternalUser(entity.getIsExternalUser())
                .firstRegisterId(entity.getCreatedBy())
                .createdDate(entity.getCreatedDate())
                .build();
    }
}
