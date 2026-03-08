package com.company.project.domain.integration;

import com.company.project.domain.common.BaseEntity;
import jakarta.persistence.*;
import lombok.*;
import java.io.Serializable;

/**
 * CntcSystem Entity
 */
@Entity
@Table(name = "NCNTCSYSTEM")
@IdClass(CntcSystem.CntcSystemId.class)
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
public class CntcSystem extends BaseEntity {

    @Id
    @Column(name = "SYS_ID", length = 20)
    private String sysId;

    @Column(name = "SYS_NM", nullable = false, length = 100)
    private String sysNm;

    @Column(name = "SYS_IP", length = 23)
    private String sysIp;

    @Id
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "INSTT_ID")
    private CntcInstt instt;

    @Column(name = "USE_AT", length = 1)
    private String useAt;

    public void update(String sysNm, String sysIp, CntcInstt instt, String useAt) {
        this.sysNm = sysNm;
        this.sysIp = sysIp;
        this.instt = instt;
        this.useAt = useAt;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @EqualsAndHashCode
    @Builder
    public static class CntcSystemId implements Serializable {
        private String sysId;
        private String instt;
    }
}
