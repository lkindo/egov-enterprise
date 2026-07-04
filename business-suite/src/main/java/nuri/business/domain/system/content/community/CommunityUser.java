package nuri.business.domain.system.content.community;
import jakarta.persistence.EntityListeners;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import nuri.business.domain.common.BaseEntity;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.experimental.SuperBuilder;
import jakarta.persistence.*;
import org.hibernate.annotations.Filter;
import java.io.Serializable;

@EntityListeners(AuditingEntityListener.class)
@Entity
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Table(name = "tb_cmnty_user_map")
@SuperBuilder
@Filter(name = "softDeleteFilter", condition = "use_yn = :useYn")
public class CommunityUser extends BaseEntity implements Serializable {

    @EmbeddedId
    private CommunityUserId id;

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

    public void approve() {
        this.mbrSttsCd = "P"; // Example status for approved
    }

    public void withdraw() {
        this.useYn = "N";
        this.whdwlYmd = java.time.LocalDate.now().format(java.time.format.DateTimeFormatter.ofPattern("yyyyMMdd"));
        this.mngrYn = "N";
    }

    public void grantAdmin() {
        this.mngrYn = "Y";
    }

    public void revokeAdmin() {
        this.mngrYn = "N";
    }
}
