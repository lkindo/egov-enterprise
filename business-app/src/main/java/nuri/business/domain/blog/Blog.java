package nuri.business.domain.blog;

import nuri.foundation.domain.common.BaseEntity;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * 블로그 정보 엔티티 (TB_BLOG_INFO)
 *
 * <p>[Phase 5.2 규범 적용] 클래스 레벨 {@code @SuperBuilder}/{@code @Setter}/{@code @AllArgsConstructor} 를
 * 제거하고, 빌더는 정적 팩토리 {@link #create}에 {@code @Builder} 로 배치한다. 감사 필드(frstRgtrId 등)는
 * 빌더에서 제외하고 표준 Auditing 파이프라인(@CreatedBy)에 위임한다. {@code @EntityListeners} 는
 * {@code BaseTimeEntity} 에서 전파되므로 재선언하지 않는다. 기본 생성자는 JPA 프록시 보장을 위해 protected.
 */
@Entity
@Table(name = "tb_blog_info")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Blog extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "blog_sn")
    private Long blogSn;

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

    private Blog(Long blogSn, String blogTtl, String blogIntroCn, String regSeCd,
            String tmpltId, String useYn, String bbsId, String blogYn) {
        this.blogSn = blogSn;
        this.blogTtl = blogTtl;
        this.blogIntroCn = blogIntroCn;
        this.regSeCd = regSeCd;
        this.tmpltId = tmpltId;
        this.useYn = useYn;
        this.bbsId = bbsId;
        this.blogYn = blogYn;
    }

    /**
     * 블로그 생성 정적 팩토리(빌더 진입점). {@code Blog.builder()...build()} 호출부는 그대로 동작한다.
     */
    @Builder
    public static Blog create(Long blogSn, String blogTtl, String blogIntroCn, String regSeCd,
            String tmpltId, String useYn, String bbsId, String blogYn) {
        return new Blog(blogSn, blogTtl, blogIntroCn, regSeCd, tmpltId, useYn, bbsId, blogYn);
    }

    public void update(String blogTtl, String blogIntroCn, String useYn) {
        this.blogTtl = blogTtl;
        this.blogIntroCn = blogIntroCn;
        this.useYn = useYn;
    }
}
