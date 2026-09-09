package nuri.business.domain.operation;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.springframework.data.domain.Persistable;

import java.time.LocalDateTime;

@Entity
@Table(name = "tb_extrl_hr_info")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@IdClass(ExternalHrId.class)
public class ExternalHr implements Persistable<ExternalHrId> {

    /**
     * 할당형 복합키도 생성 시 {@code persist}를 사용한다. 기본 {@code save} 판정에 맡기면
     * non-null ID가 기존 행으로 오인되어 같은 키의 등록 요청이 {@code merge}로 덮어써진다.
     */
    @Transient
    private boolean newEntity = true;

    @Id
    // 행사 숫자 FK는 복합키 식별자이자 하단 연관관계와 동일 물리 컬럼을 공유한다.
    @Column(name = "evnt_sn")
    private Long evntSn;

    @Id
    @Column(length = 20)
    private String otsdHrId;

    @Column(length = 12)
    private String gndrCd;

    @Column(length = 100)
    private String otsdHrNm;

    @Column(length = 12)
    private String crTypeCd;

    @Column(length = 200)
    private String ogdpInstNm;

    @Column(length = 8)
    private String brdtYmd;

    @Column(length = 4)
    private String areaNo;

    @Column(length = 4)
    private String mdTelno;

    @Column(length = 4)
    private String endTelno;

    @Column(length = 320)
    private String emlAddr;

    private LocalDateTime crtDt;

    @Column(length = 20)
    private String frstRgtrId;

    private LocalDateTime mdfcnDt;

    @Column(length = 20)
    private String lastMdfrId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "evnt_sn", insertable = false, updatable = false)
    private EventInfo event;

    @Override
    public ExternalHrId getId() {
        return new ExternalHrId(evntSn, otsdHrId);
    }

    @Override
    public boolean isNew() {
        return newEntity;
    }

    @PostLoad
    @PostPersist
    void markNotNew() {
        this.newEntity = false;
    }

    @Builder
    public ExternalHr(Long evntSn, String otsdHrId, String gndrCd, String otsdHrNm,
                      String crTypeCd, String ogdpInstNm, String brdtYmd, String areaNo,
                      String mdTelno, String endTelno, String emlAddr,
                      String frstRgtrId, String lastMdfrId) {
        this.evntSn = evntSn;
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
        this.frstRgtrId = frstRgtrId;
        this.crtDt = LocalDateTime.now();
        this.lastMdfrId = lastMdfrId;
        this.mdfcnDt = LocalDateTime.now();
    }

    /**
     * 식별자(evntSn·otsdHrId)를 제외한 정보를 갱신한다(2026-09-05 DEC-OPS-036 — 종전에는 등록만 되고
     * 고칠 수 없었다). 이 엔티티는 BaseEntity 감사를 쓰지 않는 수동 감사 필드라 여기서 수정자·수정일을 찍는다.
     */
    public void update(String gndrCd, String otsdHrNm, String crTypeCd, String ogdpInstNm, String brdtYmd,
                       String areaNo, String mdTelno, String endTelno, String emlAddr, String lastMdfrId) {
        this.gndrCd = gndrCd;
        this.otsdHrNm = otsdHrNm;
        this.crTypeCd = crTypeCd;
        this.ogdpInstNm = ogdpInstNm;
        this.brdtYmd = brdtYmd;
        this.areaNo = areaNo;
        this.mdTelno = mdTelno;
        this.endTelno = endTelno;
        this.emlAddr = emlAddr;
        this.lastMdfrId = lastMdfrId;
        this.mdfcnDt = LocalDateTime.now();
    }
}
