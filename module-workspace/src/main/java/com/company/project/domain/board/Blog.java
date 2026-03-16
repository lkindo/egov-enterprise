package com.company.project.domain.board;
import jakarta.persistence.EntityListeners;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import com.company.project.domain.common.BaseEntity;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.experimental.SuperBuilder;

@EntityListeners(AuditingEntityListener.class)
@Entity
@Table(name = "NBLOG")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@SuperBuilder
public class Blog extends BaseEntity {

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

    @Column(name = "BBS_ID", length = 20)
    private String bbsId;

    @Column(name = "BLOG_AT", length = 1)
    private String blogAt;

    public void update(String blogNm, String blogIntrcn, String useAt) {
        this.blogNm = blogNm;
        this.blogIntrcn = blogIntrcn;
        this.useAt = useAt;
    }
}
