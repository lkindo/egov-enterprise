package nuri.business.service.board.dto;

import nuri.business.domain.board.Blog;
import lombok.*;
import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonProperty;
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

    @JsonProperty("regTypeCd")
    private String regSeCd;

    @JsonProperty("tmplatId")
    private String tmpltId;

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

    @JsonIgnore
    public String getRegTypeCd() { return regSeCd; }
    @JsonIgnore
    public void setRegTypeCd(String v) { this.regSeCd = v; }
    @JsonIgnore
    public String getTmplatId() { return tmpltId; }
    @JsonIgnore
    public void setTmplatId(String v) { this.tmpltId = v; }

    public static BlogDto from(Blog entity) {
        if (entity == null)
            return null;
        return BlogDto.builder()
                .blogId(entity.getBlogId())
                .bbsId(entity.getBbsId())
                .blogTtl(entity.getBlogTtl())
                .blogIntroCn(entity.getBlogIntroCn())
                .regSeCd(entity.getRegSeCd())
                .tmpltId(entity.getTmpltId())
                .useYn(entity.getUseYn())
                .frstRegisterId(entity.getCreatedBy())
                .frstRegisterPnttm(entity.getCreatedDate())
                .lastUpdusrId(entity.getLastModifiedBy())
                .lastUpdtPnttm(entity.getLastModifiedDate())
                .blogYn(entity.getBlogYn())
                .build();
    }
}
