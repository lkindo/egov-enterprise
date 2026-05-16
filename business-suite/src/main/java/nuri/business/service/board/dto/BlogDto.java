package nuri.business.service.board.dto;

import nuri.business.domain.board.Blog;
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
    private String blogTtl;
    private String blogIntroCn;
    private String regTypeCd;
    private String tmplatId;
    private String useYn;
    private String frstRegisterId;
    private LocalDateTime frstRegisterPnttm;
    private String lastUpdusrId;
    private LocalDateTime lastUpdtPnttm;
    private String blogYn;

    // legacy
    public String getBlogNm() { return blogTtl; }
    public void setBlogNm(String v) { this.blogTtl = v; }
    public String getBlogIntrcn() { return blogIntroCn; }
    public void setBlogIntrcn(String v) { this.blogIntroCn = v; }
    public LocalDateTime getCreatedDate() { return frstRegisterPnttm; }
    public LocalDateTime getLastUpdusrPnttm() { return lastUpdtPnttm; }

    public static BlogDto from(Blog entity) {
        if (entity == null)
            return null;
        return BlogDto.builder()
                .blogId(entity.getBlogId())
                .bbsId(entity.getBbsId())
                .blogTtl(entity.getBlogTtl())
                .blogIntroCn(entity.getBlogIntroCn())
                .regTypeCd(entity.getRegTypeCd())
                .tmplatId(entity.getTmplatId())
                .useYn(entity.getUseYn())
                .frstRegisterId(entity.getCreatedBy())
                .frstRegisterPnttm(entity.getCreatedDate())
                .lastUpdusrId(entity.getLastModifiedBy())
                .lastUpdtPnttm(entity.getLastModifiedDate())
                .blogYn(entity.getBlogYn())
                .build();
    }
}
