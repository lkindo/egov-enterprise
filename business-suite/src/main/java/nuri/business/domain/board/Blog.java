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

@EntityListeners(AuditingEntityListener.class)
@Entity
@Table(name = "tb_blog_info")
@Getter
@Setter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@SuperBuilder
public class Blog extends BaseEntity {

    @Id
    @Column(name = "blog_id", length = 20)
    private String blogId;

    @Column(name = "blog_ttl", nullable = false, length = 300)
    private String blogTtl;

    @Column(name = "blog_intro_cn", length = 4000)
    private String blogIntroCn;

    @Column(name = "reg_se_cd", length = 12)
    private String regTypeCd;

    @Column(name = "tmplt_id", length = 20)
    private String tmplatId;

    @Column(name = "use_yn", length = 1)
    private String useYn;

    @Column(name = "bbs_id", length = 20)
    private String bbsId;

    @Column(name = "blog_yn", length = 1)
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

}
