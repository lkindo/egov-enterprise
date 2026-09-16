package nuri.business.domain.informalsanction;

import jakarta.persistence.Column;
import jakarta.persistence.EmbeddedId;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import nuri.foundation.domain.common.BaseEntity;

import java.time.LocalDateTime;

@Entity
@Table(name = "tb_ifml_atrz_hstry")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class InformalSanctionHistory extends BaseEntity {
    @EmbeddedId
    private InformalSanctionHistoryId id;
    @Column(length = 256)
    private String docTtl;
    @Column(length = 4000)
    private String docCn;
    @Column(length = 12, nullable = false)
    private String taskSeCd;
    @Column(length = 8)
    private String reqYmd;
    @Column(length = 1, nullable = false)
    private String aprvYn;
    private LocalDateTime atrzDt;
    @Column(length = 4000)
    private String rjctRsnCn;

    public static InformalSanctionHistory create(InformalSanction sanction) {
        InformalSanctionHistory history = new InformalSanctionHistory();
        history.id = new InformalSanctionHistoryId(sanction.getIfmlAtrzSn(), sanction.getAtrzCycl());
        history.docTtl = sanction.getDocTtl();
        history.docCn = sanction.getDocCn();
        history.taskSeCd = sanction.getTaskSeCd();
        history.reqYmd = sanction.getReqYmd();
        history.updateResult(sanction);
        return history;
    }

    public void updateResult(InformalSanction sanction) {
        this.aprvYn = sanction.getAprvYn();
        this.atrzDt = sanction.getAtrzDt();
        this.rjctRsnCn = sanction.getRjctRsnCn();
    }
}
