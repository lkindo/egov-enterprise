package com.company.project.service.board.dto;

import com.company.project.domain.board.Blog;
import lombok.*;
import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BlogDto {
    private String blogId;
    private String bbsId;
    private String blogNm;
    private String blogIntrcn;
    private String registSeCode;
    private String tmplatId;
    private String useAt;
    private String frstRegisterId;
    private LocalDateTime frstRegisterPnttm;
    private String lastUpdusrId;
    private LocalDateTime lastUpdusrPnttm;
    private String blogAt;

    public static BlogDto from(Blog entity) {
        if (entity == null)
            return null;
        return BlogDto.builder()
                .blogId(entity.getBlogId())
                .bbsId(entity.getBbsId())
                .blogNm(entity.getBlogNm())
                .blogIntrcn(entity.getBlogIntrcn())
                .registSeCode(entity.getRegistSeCode())
                .tmplatId(entity.getTmplatId())
                .useAt(entity.getUseAt())
                .frstRegisterId(entity.getCreatedBy())
                .frstRegisterPnttm(entity.getCreatedDate())
                .lastUpdusrId(entity.getLastModifiedBy())
                .lastUpdusrPnttm(entity.getLastModifiedDate())
                .blogAt(entity.getBlogAt())
                .build();
    }
}
