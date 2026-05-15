package nuri.business.domain.board;
import jakarta.persistence.EntityListeners;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;
import lombok.experimental.SuperBuilder;

import nuri.foundation.domain.common.BaseTimeEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.IdClass;
import jakarta.persistence.Table;
import lombok.AccessLevel;

import lombok.Getter;
import lombok.NoArgsConstructor;
import java.io.Serializable;

@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@EntityListeners(AuditingEntityListener.class)
@Entity
@Table(name = "TB_BBS_USE_INFO")
@IdClass(BoardUseId.class)
@SuperBuilder
public class BoardUse extends BaseTimeEntity implements Serializable {

    @Id
    @Column(name = "BBS_ID", length = 20)
    private String bbsId;

    @Id
    @Column(name = "TRGET_ID", length = 20)
    private String trgetId;

    @Column(name = "REG_SE_CD", length = 6)
    private String registSeCode;

    @Column(name = "USE_YN", length = 1)
    private String useYn;

    public BoardUse(String bbsId, String trgetId, String registSeCode, String useYn) {
        this.bbsId = bbsId;
        this.trgetId = trgetId;
        this.registSeCode = registSeCode;
        this.useYn = useYn;
    }

    public void update(String useYn) {
        this.useYn = useYn;
    }

    public void setUseYn(String useYn) {
        this.useYn = useYn;
    }

    public void setLastUpdusrId(String lastUpdusrId) {
        // This field doesn't exist in the entity - kept for compatibility
    }

    public void setFrstRegisterId(String frstRegisterId) {
        // This field doesn't exist in the entity - kept for compatibility
    }
}
