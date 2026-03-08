package com.company.project.domain.board;

import jakarta.persistence.*;
import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;
import java.time.LocalDateTime;

@Entity
@Table(name = "NBLOG")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
@EntityListeners(AuditingEntityListener.class)
public class Blog {

    @Id
    @Column(name = "BLOG_ID", length = 20)
    private String blogId;

    @Column(name = "BLOG_NM", nullable = false, length = 255)
    private String blogNm;

    @Column(name = "BLOG_INTRCN", length = 2400)
    private String blogIntrcn;

    @Column(name = "REGIST_SE_CODE", length = 6)
    private String registSeCode;

    @Column(name = "TMPLAT_ID", length = 20)
    private String tmplatId;

    @Column(name = "USE_AT", length = 1)
    private String useAt;

    @Column(name = "FRST_REGISTER_ID", length = 20)
    private String frstRegisterId;

    @CreatedDate
    @Column(name = "FRST_REGIST_PNTTM")
    private LocalDateTime frstRegisterPnttm;

    @Column(name = "LAST_UPDUSR_ID", length = 20)
    private String lastUpdusrId;

    @LastModifiedDate
    @Column(name = "LAST_UPDT_PNTTM")
    private LocalDateTime lastUpdusrPnttm;

    @Column(name = "BBS_ID", length = 20)
    private String bbsId;

    @Column(name = "BLOG_AT", length = 1)
    private String blogAt;

    public void update(String blogNm, String blogIntrcn, String useAt, String lastUpdusrId) {
        this.blogNm = blogNm;
        this.blogIntrcn = blogIntrcn;
        this.useAt = useAt;
        this.lastUpdusrId = lastUpdusrId;
    }
}
