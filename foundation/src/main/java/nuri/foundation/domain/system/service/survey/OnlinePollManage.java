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
@Table(name = "tb_onln_poll_manage")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@SuperBuilder
public class OnlinePollManage extends BaseEntity {

    @Id
    @Column(name = "poll_id", length = 20)
    private String pollId;

    @Column(name = "poll_nm", length = 300, nullable = false)
    private String pollNm;

    @Column(name = "poll_bgng_ymd", length = 8)
    private String pollBgngYmd;

    @Column(name = "poll_end_ymd", length = 8)
    private String pollEndYmd;

    @Column(name = "poll_knd_cd", length = 30)
    private String pollTypeCd;

    @Column(name = "poll_dsuse_yn", length = 1)
    @Builder.Default
    private String pollDsuseYn = "N";

    @Column(name = "poll_atmc_dsuse_yn", length = 1)
    @Builder.Default
    private String pollAutoDsuseYn = "N";

    @OneToMany(mappedBy = "pollManage", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<OnlinePollItem> pollItems = new ArrayList<>();

    public void update(String pollNm, String pollBgngYmd, String pollEndYmd, String pollTypeCd,
            String pollDsuseYn, String pollAutoDsuseYn) {
        this.pollNm = pollNm;
        this.pollBgngYmd = pollBgngYmd;
        this.pollEndYmd = pollEndYmd;
        this.pollTypeCd = pollTypeCd;
        this.pollDsuseYn = pollDsuseYn;
        this.pollAutoDsuseYn = pollAutoDsuseYn;
    }

    // legacy
    public String getPollTtl() { return pollNm; }
    public void setPollTtl(String v) { this.pollNm = v; }
}
