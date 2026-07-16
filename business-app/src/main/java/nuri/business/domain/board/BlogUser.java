package nuri.business.domain.board;

import nuri.foundation.domain.common.BaseEntity;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.experimental.SuperBuilder;
import java.io.Serializable;

/**
 * 블로그 사용자 매핑 엔티티 (TB_BLOG_USER_MAP)
 *
 * <p>[Phase 5.2 규범 적용] 클래스 레벨 {@code @SuperBuilder} 를 제거하고 정적 팩토리 {@link #create}에
 * {@code @Builder} 배치. 감사 필드는 표준 Auditing 파이프라인(@CreatedBy)에 위임하며,
 * {@code @EntityListeners} 는 {@code BaseTimeEntity} 에서 전파되므로 재선언하지 않는다.
 */
@Entity
@Table(name = "tb_blog_user_map")
@IdClass(BlogUserId.class)
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class BlogUser extends BaseEntity {

    @Id
    @Column(length = 20)
    private String blogId;

    @Id
    @Column(length = 20)
    private String userId;

    @Column(length = 1)
    private String mngrYn;

    @Column(length = 8)
    private String joinYmd;

    @Column(length = 8)
    private String whdwlYmd;

    @Column(length = 12)
    private String mbrSttsCd;

    @Column(length = 1)
    private String useYn;

    private BlogUser(String blogId, String userId, String mngrYn, String joinYmd,
            String whdwlYmd, String mbrSttsCd, String useYn) {
        this.blogId = blogId;
        this.userId = userId;
        this.mngrYn = mngrYn;
        this.joinYmd = joinYmd;
        this.whdwlYmd = whdwlYmd;
        this.mbrSttsCd = mbrSttsCd;
        this.useYn = useYn;
    }

    @Builder
    public static BlogUser create(String blogId, String userId, String mngrYn, String joinYmd,
            String whdwlYmd, String mbrSttsCd, String useYn) {
        return new BlogUser(blogId, userId, mngrYn, joinYmd, whdwlYmd, mbrSttsCd, useYn);
    }
}

@EqualsAndHashCode
@NoArgsConstructor
@AllArgsConstructor
@Getter
@SuperBuilder
class BlogUserId implements Serializable {
    private String blogId;
    private String userId;
}
