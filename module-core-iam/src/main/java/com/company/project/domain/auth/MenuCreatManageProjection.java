package com.company.project.domain.auth;

import lombok.*;
import java.time.LocalDateTime;

@Getter
@Setter
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class MenuCreatManageProjection {
    private String authorCode;
    private String authorNm;
    private String authorDc;
    private LocalDateTime authorCreatDe;
    private Long chkYeoBu;
}
