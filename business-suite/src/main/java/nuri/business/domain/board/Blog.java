package nuri.business.domain.board;
import jakarta.persistence.EntityListeners;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import nuri.foundation.domain.common.BaseEntity;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.experimental.SuperBuilder;

@EntityListeners(AuditingEntityListener.class)
@Entity
@Table(name = "TB_BLOG_INFO")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@SuperBuilder
public class Blog extends BaseEntity {

    @Id
    @Column(name = "BLOG_ID", length = 20)
    private String blogId;

    @Column(name = "BLOG_TTL", nullable = false, length = 300)
    private String blogTtl;

    @Column(name = "BLOG_INTRO_CN", length = 4000)
    private String blogIntroCn;

    @Column(name = "REG_SE_CD", length = 12)
    private String regTypeCd;

    @Column(name = "TMPLAT_ID", length = 20)
    private String tmplatId;

    @Column(name = "USE_YN", length = 1)
    private String useYn;

    @Column(name = "BBS_ID", length = 20)
    private String bbsId;

    @Column(name = "BLOG_YN", length = 1)
    private String blogYn;

    public void update(String blogTtl, String blogIntroCn, String useYn) {
        this.blogTtl = blogTtl;
        this.blogIntroCn = blogIntroCn;
        this.useYn = useYn;
    }
}
