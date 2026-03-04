package com.company.project.domain.integration;

import com.company.project.domain.common.BaseEntity;
import jakarta.persistence.*;
import lombok.*;

/**
 * ??뽯뮞???怨뚰??온???酉???
 */
@Entity
@Table(name = "NSYSTEMCNTC")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
public class SystemCntc extends BaseEntity {

    @Id
    @Column(name = "CNTC_ID", length = 20)
    private String cntcId;

    @Column(name = "CNTC_NM", nullable = false, length = 100)
    private String cntcNm;

    @Column(name = "CNTC_TYPE", length = 60)
    private String cntcType;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "PROVD_INSTT_ID", insertable = false, updatable = false)
    private CntcInstt provdInstt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumns({
            @JoinColumn(name = "PROVD_SYS_ID", referencedColumnName = "SYS_ID"),
            @JoinColumn(name = "PROVD_INSTT_ID", referencedColumnName = "INSTT_ID")
    })
    private CntcSystem provdSys;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "REQUST_INSTT_ID", insertable = false, updatable = false)
    private CntcInstt requstInstt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumns({
            @JoinColumn(name = "REQUST_SYS_ID", referencedColumnName = "SYS_ID"),
            @JoinColumn(name = "REQUST_INSTT_ID", referencedColumnName = "INSTT_ID")
    })
    private CntcSystem requstSys;

    @Column(name = "USE_AT", length = 1)
    private String useAt;

    @Column(name = "CONFM_AT", length = 1)
    private String confmAt;

    public void update(String cntcNm, String cntcType, String useAt) {
        this.cntcNm = cntcNm;
        this.cntcType = cntcType;
        this.useAt = useAt;
    }

    public void approve() {
        this.confmAt = "Y";
    }
}