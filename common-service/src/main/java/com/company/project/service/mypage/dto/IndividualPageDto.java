package com.company.project.service.mypage.dto;

import lombok.*;
import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class IndividualPageDto {
    private String pageId;
    private String pageNm;
    private String pageDc;
    private String userId;
}
