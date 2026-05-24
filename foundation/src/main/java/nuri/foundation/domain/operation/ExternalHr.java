package nuri.foundation.domain.operation;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "tb_extrl_hr_info")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@IdClass(ExternalHrId.class)
public class ExternalHr {

    @Id
    // [JPA 복합키 식별자-외래키 컬럼 공유 규칙]
    // evntId는 복합키 식별자 필드이자, 하단의 @ManyToOne event 연관관계 필드의 @JoinColumn("EVNT_ID")과 
    // 동일한 실제 물리 DB 컬럼(evnt_id)을 공유(Shared Column Mapping)하고 있습니다.
    // 명시적인 name = "evnt_id" 지정을 누락하면, Hibernate는 두 프로퍼티 간의 물리 컬럼 병합을 
    // 인식하지 못해 DuplicateMappingException을 유발하므로 이 name 속성은 반드시 명시적으로 보존해야 합니다.
    @Column(name = "evnt_id", length = 20)
    private String evntId;

    @Id
    @Column(length = 20)
    private String otsdHrId;

    @Column(length = 12)
    private String gndrCd;

    @Column(length = 100)
    private String otsdHrNm;

    @Column(length = 12)
    private String crTypeCd;

    @Column(length = 100)
    private String ogdpInstNm;

    @Column(length = 8)
    private String brdtYmd;

    @Column(length = 4)
    private String areaNo;

    @Column(length = 4)
    private String mdTelno;

    @Column(length = 4)
    private String endTelno;

    @Column(length = 100)
    private String emlAddr;

    private LocalDateTime crtDt;

    @Column(length = 20)
    private String frstRgtrId;

    private LocalDateTime mdfcnDt;

    @Column(length = 20)
    private String lastMdfrId;

    // ----- [Legacy Getter Aliases] -----

    public LocalDateTime getFrstRegistPnttm() {
        return this.crtDt;
    }

    public String getFrstRegisterId() {
        return this.frstRgtrId;
    }

    public LocalDateTime getLastUpdtPnttm() {
        return this.mdfcnDt;
    }

    public String getLastUpdusrId() {
        return this.lastMdfrId;
    }

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "EVNT_ID", insertable = false, updatable = false)
    private EventInfo event;

    @Builder
    public ExternalHr(String evntId, String otsdHrId, String gndrCd, String otsdHrNm,
                      String crTypeCd, String ogdpInstNm, String brdtYmd, String areaNo,
                      String mdTelno, String endTelno, String emlAddr,
                      String frstRegisterId, String lastUpdusrId) {
        this.evntId = evntId;
        this.otsdHrId = otsdHrId;
        this.gndrCd = gndrCd;
        this.otsdHrNm = otsdHrNm;
        this.crTypeCd = crTypeCd;
        this.ogdpInstNm = ogdpInstNm;
        this.brdtYmd = brdtYmd;
        this.areaNo = areaNo;
        this.mdTelno = mdTelno;
        this.endTelno = endTelno;
        this.emlAddr = emlAddr;
        this.frstRgtrId = frstRegisterId;
        this.crtDt = LocalDateTime.now();
        this.lastMdfrId = lastUpdusrId;
        this.mdfcnDt = LocalDateTime.now();
    }
}
