package com.company.project.service.community.dto;

import java.time.LocalDateTime;
import com.company.project.domain.community.CommunityUser;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class CommunityUserDto {
    private String cmmntyId;
    private String emplyrId;
    private String emplyrNm; // Fetched from User service if needed
    private String mngrAt;
    private String mberSttus;
    private LocalDateTime sbscrbDe;
    private String secsnDe;
    private String useAt;
    private String frstRegisterId;
    private LocalDateTime frstRegisterPnttm;

    public static CommunityUserDto from(CommunityUser entity) {
        return CommunityUserDto.builder()
                .cmmntyId(entity.getCmmntyId())
                .emplyrId(entity.getEmplyrId())
                .mngrAt(entity.getMngrAt())
                .mberSttus(entity.getMberSttus())
                .sbscrbDe(entity.getSbscrbDe())
                .secsnDe(entity.getSecsnDe())
                .useAt(entity.getUseAt())
                .frstRegisterId(entity.getFrstRegisterId())
                .frstRegisterPnttm(entity.getCreatedDate())
                .build();
    }
}
