package com.company.project.service.isg.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.*;
import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class InternetSvcGuidanceDto {
    private String intnetSvcId;

    @NotBlank(message = "인터넷 서비스 명칭은 필수입니다.")
    @Size(max = 255, message = "인터넷 서비스 명칭은 255자 이내여야 합니다.")
    private String intnetSvcNm;

    @NotBlank(message = "인터넷 서비스 설명은 필수입니다.")
    @Size(max = 1000, message = "인터넷 서비스 설명은 1000자 이내여야 합니다.")
    private String intnetSvcDc;

    @Size(max = 1, message = "반영 여부는 1자여야 합니다.")
    private String reflctAt;
    private String userId;
    private LocalDateTime regDate;
}
