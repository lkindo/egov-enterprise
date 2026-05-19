package nuri.business.domain.board;
import jakarta.persistence.EntityListeners;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import nuri.foundation.domain.common.BaseEntity;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.experimental.SuperBuilder;
import java.io.Serializable;

@EntityListeners(AuditingEntityListener.class)
@Entity
@Table(name = "TB_BLOG_USER_MAP")
@IdClass(BlogUserId.class)
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@SuperBuilder
public class BlogUser extends BaseEntity {

    @Id
    @Column(name = "BLOG_ID", length = 20)
    private String blogId;

    @Id
    @Column(name = "USER_ID", length = 30)
    private String userId;

    @Column(name = "MNGR_YN", length = 1)
    private String mngrYn;

    @Column(name = "JOIN_YMD", length = 8)
    private String joinYmd;

    @Column(name = "WHDWL_YMD", length = 8)
    private String wdrlYmd;

    @Column(name = "MBR_STTS_CD", length = 12)
    private String mbrSttsCd;

    @Column(name = "USE_YN", length = 1)
    private String useYn;
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
