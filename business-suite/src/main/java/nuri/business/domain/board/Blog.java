package nuri.business.domain.board;
import jakarta.persistence.EntityListeners;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import nuri.business.domain.common.BaseEntity;
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

    @Column(nullable = false, length = 300)
    private String blogTtl;

    @Column(length = 4000)
    private String blogIntroCn;

    @Column(length = 12)
    private String regSeCd;

    @Column(length = 20)
    private String tmpltId;

    @Column(length = 1)
    private String useYn;

    @Column(length = 20)
    private String bbsId;

    @Column(length = 1)
    private String blogYn;

    public void update(String blogTtl, String blogIntroCn, String useYn) {
        this.blogTtl = blogTtl;
        this.blogIntroCn = blogIntroCn;
        this.useYn = useYn;
    }
}
