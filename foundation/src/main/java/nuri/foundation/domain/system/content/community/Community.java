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
@Table(name = "tb_cmnty_info")
@SuperBuilder
public class Community extends BaseEntity implements Serializable {

    @Id
    @Column(name = "cmnty_id", length = 20, nullable = false)
    private String cmntyId;

    @Column(name = "cmnty_nm", length = 100)
    private String cmntyTtl;

    @Column(name = "cmnty_intro_cn", length = 4000)
    private String cmntyIntroCn;

    @Column(name = "reg_se_cd", length = 12)
    private String regTypeCd;

    @Column(name = "tmplt_id", length = 20)
    private String tmplatId;

    @Column(name = "use_yn", length = 1)
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
