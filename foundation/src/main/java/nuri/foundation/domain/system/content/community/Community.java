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
@Table(name = "NCMMNTY")
@SuperBuilder
public class Community extends BaseEntity implements Serializable {

    @Id
    @Column(name = "CMMNTY_ID", length = 20, nullable = false)
    private String cmmntyId;

    @Column(name = "CMMNTY_NM", length = 255)
    private String cmmntyNm;

    @Column(name = "CMMNTY_INTRCN", length = 2400)
    private String cmmntyIntrcn;

    @Column(name = "REGIST_SE_CODE", length = 6)
    private String registSeCode;

    @Column(name = "TMPLAT_ID", length = 20)
    private String tmplatId;

    @Column(name = "USE_AT", length = 1)
    private String useAt;

    public void update(String cmmntyNm, String cmmntyIntrcn, String tmplatId, String useAt) {
        this.cmmntyNm = cmmntyNm;
        this.cmmntyIntrcn = cmmntyIntrcn;
        this.tmplatId = tmplatId;
        this.useAt = useAt;
    }

    public void delete() {
        this.useAt = "N";
    }
}
