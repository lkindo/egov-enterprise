package com.company.project.service.mypage.dto;

import com.company.project.domain.mypage.MyPageContent;
import lombok.Builder;
import lombok.Getter;
import java.time.LocalDateTime;

@Getter
@Builder
public class MyPageContentDto {
    private String cntntsId;
    private String cntntsNm;
    private String cntntsLinkUrl;
    private String cntntsDc;
    private String cntntsUseAt;
    private String frstRegisterId;
    private LocalDateTime frstRegisterPnttm;

    public MyPageContentDto() {
    }

    public MyPageContentDto(String cntntsId, String cntntsNm, String cntntsLinkUrl, String cntntsDc,
                           String cntntsUseAt, String frstRegisterId, LocalDateTime frstRegisterPnttm) {
        this.cntntsId = cntntsId;
        this.cntntsNm = cntntsNm;
        this.cntntsLinkUrl = cntntsLinkUrl;
        this.cntntsDc = cntntsDc;
        this.cntntsUseAt = cntntsUseAt;
        this.frstRegisterId = frstRegisterId;
        this.frstRegisterPnttm = frstRegisterPnttm;
    }

    public static MyPageContentDto from(MyPageContent entity) {
        return MyPageContentDto.builder()
                .cntntsId(entity.getCntntsId())
                .cntntsNm(entity.getCntntsNm())
                .cntntsLinkUrl(entity.getCntntsLinkUrl())
                .cntntsDc(entity.getCntntsDc())
                .cntntsUseAt(entity.getCntntsUseAt())
                .frstRegisterId(entity.getFrstRegisterId())
                .frstRegisterPnttm(entity.getFrstRegisterPnttm())
                .build();
    }
}

