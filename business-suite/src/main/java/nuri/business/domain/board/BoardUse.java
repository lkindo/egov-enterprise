package nuri.business.domain.board;
import jakarta.persistence.EntityListeners;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;
import lombok.experimental.SuperBuilder;

import nuri.business.domain.common.BaseTimeEntity;
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
@Table(name = "tb_bbs_use_info")
@IdClass(BoardUseId.class)
@SuperBuilder
public class BoardUse extends BaseTimeEntity implements Serializable {

    @Id
    @Column(name = "bbs_id", length = 20)
    private String bbsId;

    @Id
    @Column(name = "trgt_id", length = 20)
    private String trgtId;

    @Column(length = 12)
    private String rgstrSeCd;

    @Column(length = 1)
    private String useYn;

    public BoardUse(String bbsId, String trgtId, String rgstrSeCd, String useYn) {
        this.bbsId = bbsId;
        this.trgtId = trgtId;
        this.rgstrSeCd = rgstrSeCd;
        this.useYn = useYn;
    }


    public void update(String useYn) {
        this.useYn = useYn;
    }

    public void setUseYn(String useYn) {
        this.useYn = useYn;
    }

    public void setLastMdfrId(String lastUpdusrId) {
        // This field doesn't exist in the entity - kept for compatibility
    }

    public void setFrstRgtrId(String frstRegisterId) {
        // This field doesn't exist in the entity - kept for compatibility
    }
}
