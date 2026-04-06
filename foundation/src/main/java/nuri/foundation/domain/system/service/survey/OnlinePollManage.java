package nuri.foundation.domain.system.service.survey;
import jakarta.persistence.EntityListeners;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import nuri.foundation.domain.common.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.OneToMany;
import jakarta.persistence.CascadeType;
import lombok.*;
import lombok.experimental.SuperBuilder;
import lombok.Builder;
import java.util.ArrayList;
import java.util.List;

/**
 * 온라인 폴 관리 엔티티
 * 매핑 테이블: NONLINEPOLLMANAGE
 */
@EntityListeners(AuditingEntityListener.class)
@Entity
@Table(name = "NONLINEPOLLMANAGE")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@SuperBuilder
public class OnlinePollManage extends BaseEntity {

    @Id
    @Column(name = "POLL_ID", length = 20)
    private String pollId;

    @Column(name = "POLL_NM", length = 255, nullable = false)
    private String pollNm;

    @Column(name = "POLL_BGNDE", length = 10)
    private String pollBeginDe;

    @Column(name = "POLL_ENDDE", length = 10)
    private String pollEndDe;

    @Column(name = "POLL_KND", length = 20)
    private String pollKindCode;

    @Column(name = "POLL_DSUSE_ENNC", length = 1)
    @Builder.Default
    private String pollDsuseYn = "N";

    @Column(name = "POLL_ATMC_DSUSE_ENNC", length = 1)
    @Builder.Default
    private String pollAutoDsuseYn = "N";

    @OneToMany(mappedBy = "pollId", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<OnlinePollItem> pollItems = new ArrayList<>();

    public void update(String pollNm, String pollBeginDe, String pollEndDe, String pollKindCode,
            String pollDsuseYn, String pollAutoDsuseYn) {
        this.pollNm = pollNm;
        this.pollBeginDe = pollBeginDe;
        this.pollEndDe = pollEndDe;
        this.pollKindCode = pollKindCode;
        this.pollDsuseYn = pollDsuseYn;
        this.pollAutoDsuseYn = pollAutoDsuseYn;
    }
}
