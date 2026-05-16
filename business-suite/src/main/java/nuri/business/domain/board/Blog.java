package nuri.business.domain.board;
import jakarta.persistence.EntityListeners;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import nuri.foundation.domain.common.BaseEntity;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.experimental.SuperBuilder;
import lombok.Builder;

@EntityListeners(AuditingEntityListener.class)
@Entity
@Table(name = "TB_BLOG_INFO")
@Getter
@Setter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
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

    @Column(name = "TMPLT_ID", length = 20)
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

    // legacy
    public String getBlogNm() { return blogTtl; }
    public void setBlogNm(String v) { this.blogTtl = v; }
    public String getBlogIntrcn() { return blogIntroCn; }
    public void setBlogIntrcn(String v) { this.blogIntroCn = v; }

    // builder compatibility
    public abstract static class BlogBuilder<C extends Blog, B extends BlogBuilder<C, B>> extends BaseEntityBuilder<C, B> {
        public B blogNm(String blogNm) { this.blogTtl = blogNm; return self(); }
        public B blogIntrcn(String blogIntrcn) { this.blogIntroCn = blogIntrcn; return self(); }
    }
}
