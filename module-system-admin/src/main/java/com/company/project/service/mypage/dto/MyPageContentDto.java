package com.company.project.service.mypage.dto;

import com.company.project.domain.mypage.MyPageContent;
import lombok.Builder;
import lombok.Getter;
import java.time.LocalDateTime;

/**
 * 留덉???씠吏 ?⑦?痢?DTO
 */
@Getter
@Builder
public class MyPageContentDto {
    private String cntntsId;
    private String cntntsNm;
    private String cntntsLinkUrl;
    private String cntcUrl;
    private String cntntsDc;
    private String cntntsUseAt;
    private String frstRegisterId;
    private LocalDateTime frstRegisterPnttm;

    public static MyPageContentDto from(MyPageContent entity) {
        return MyPageContentDto.builder()
                .cntntsId(entity.getCntntsId())
                .cntntsNm(entity.getCntntsNm())
                .cntntsLinkUrl(entity.getCntntsLinkUrl())
                .cntcUrl(entity.getCntcUrl())
                .cntntsDc(entity.getCntntsDc())
                .cntntsUseAt(entity.getCntntsUseAt())
                .frstRegisterId(entity.getFrstRegisterId())
                .frstRegisterPnttm(entity.getFrstRegisterPnttm())
                .build();
    }
}
