package nuri.business.domain.system.content.community;
import jakarta.persistence.EntityListeners;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import nuri.business.domain.common.BaseEntity;
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

    @Column(length = 100)
    private String cmntyNm;

    @Column(length = 4000)
    private String cmntyIntroCn;

    @Column(length = 12)
    private String regSeCd;

    @Column(length = 20)
    private String tmpltId;

    @Column(length = 1)
    private String useYn;

    // ----- [Legacy Getter Aliases] -----

    public String getCmntyTtl() { return this.cmntyNm; }
    public String getRegTypeCd() { return this.regSeCd; }
    public String getTmplatId() { return this.tmpltId; }

    // ----- [Custom Builder Extension for Backwards Compatibility] -----

    public static abstract class CommunityBuilder<C extends Community, B extends CommunityBuilder<C, B>> extends BaseEntityBuilder<C, B> {
        public B cmntyTtl(String cmntyTtl) {
            this.cmntyNm = cmntyTtl;
            return self();
        }
        public B regTypeCd(String regTypeCd) {
            this.regSeCd = regTypeCd;
            return self();
        }
        public B tmplatId(String tmplatId) {
            this.tmpltId = tmplatId;
            return self();
        }
    }

    public void update(String cmntyTtl, String cmntyIntroCn, String tmplatId, String useYn) {
        this.cmntyNm = cmntyTtl;
        this.cmntyIntroCn = cmntyIntroCn;
        this.tmpltId = tmplatId;
        this.useYn = useYn;
    }

    public void delete() {
        this.useYn = "N";
    }
}
