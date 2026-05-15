package nuri.foundation.domain.system.content.community;
import jakarta.persistence.EntityListeners;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import nuri.foundation.domain.common.BaseEntity;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.experimental.SuperBuilder;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.io.Serializable;

@EntityListeners(AuditingEntityListener.class)
@Entity
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Table(name = "TB_CMNTY_INFO")
@SuperBuilder
public class Community extends BaseEntity implements Serializable {

    @Id
    @Column(name = "CMNTY_ID", length = 20, nullable = false)
    private String cmntyId;

    @Column(name = "CMNTY_NM", length = 300)
    private String cmntyTtl;

    @Column(name = "CMNTY_INTRO_CN", length = 4000)
    private String cmntyIntroCn;

    @Column(name = "REG_SE_CD", length = 12)
    private String regTypeCd;

    @Column(name = "TMPLAT_ID", length = 20)
    private String tmplatId;

    @Column(name = "USE_YN", length = 1)
    private String useYn;

    public void update(String cmntyTtl, String cmntyIntroCn, String tmplatId, String useYn) {
        this.cmntyTtl = cmntyTtl;
        this.cmntyIntroCn = cmntyIntroCn;
        this.tmplatId = tmplatId;
        this.useYn = useYn;
    }

    public void delete() {
        this.useYn = "N";
    }
}
