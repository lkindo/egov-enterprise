package nuri.business.domain.schedule;

import nuri.business.domain.common.BaseEntity;
import jakarta.persistence.*;
import lombok.*;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.io.Serializable;

/**
 * 일정 엔티티 (tb_schdl_info)
 *
 * <p>[Phase 5.2 규범] 클래스 레벨 @SuperBuilder 제거, 빌더는 정적 팩토리 {@link #create}에 @Builder 배치.
 * (@AllArgsConstructor 는 {@code new Schedule(...)} 호출부가 존재하여 유지, create() 가 위임)
 */
@Entity
@Table(name = "tb_schdl_info")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@EntityListeners(AuditingEntityListener.class)
public class Schedule extends BaseEntity implements Serializable {
    private static final long serialVersionUID = 1L;

    @Id
    @Column(length = 20)
    private String schdlId;

    @Column(length = 12)
    private String schdlSeCd;

    @Column(length = 100, nullable = false)
    private String schdlNm;

    @Column(columnDefinition = "TEXT", length = 4000)
    private String schdlCn;

    @Column(length = 12)
    private String reptSeCd;

    @Column(length = 8)
    private String schdlBgngYmd;

    @Column(length = 8)
    private String schdlEndYmd;

    @Transient
    private String schdlIpAddr;

    @Column(length = 20)
    private String schdlPicId;

    @Column(length = 30)
    private String atchFileId;

    // Additional fields used in service
    @Column(length = 20)
    private String schdlDeptId;
    @Column(length = 12)
    private String schdlKndCd;
    @Column(length = 100)
    private String schdlPlcNm;
    @Column(length = 12)
    private String schdlImprtCd;

    /**
     * 일정 생성 정적 팩토리(빌더 진입점). {@code Schedule.builder()...build()} 호출부는 그대로 동작한다.
     */
    @Builder
    public static Schedule create(String schdlId, String schdlSeCd, String schdlNm, String schdlCn, String reptSeCd,
            String schdlBgngYmd, String schdlEndYmd, String schdlIpAddr, String schdlPicId, String atchFileId,
            String schdlDeptId, String schdlKndCd, String schdlPlcNm, String schdlImprtCd) {
        return new Schedule(schdlId, schdlSeCd, schdlNm, schdlCn, reptSeCd, schdlBgngYmd, schdlEndYmd, schdlIpAddr,
                schdlPicId, atchFileId, schdlDeptId, schdlKndCd, schdlPlcNm, schdlImprtCd);
    }

    public void update(String schdlNm, String schdlCn, String schdlSeCd, String schdlBgngYmd, String schdlEndYmd,
                       String reptSeCd, String schdlPicId, String atchFileId) {
        this.schdlNm = schdlNm;
        this.schdlCn = schdlCn;
        this.schdlSeCd = schdlSeCd;
        this.schdlBgngYmd = schdlBgngYmd;
        this.schdlEndYmd = schdlEndYmd;
        this.reptSeCd = reptSeCd;
        this.schdlPicId = schdlPicId;
        this.atchFileId = atchFileId;
    }

    public void updateAll(String schdlNm, String schdlCn, String schdlSeCd, String schdlKndCd, String schdlBgngYmd, String schdlEndYmd,
                       String schdlPlcNm, String schdlImprtCd, String schdlPicId, String reptSeCd) {
        this.schdlNm = schdlNm;
        this.schdlCn = schdlCn;
        this.schdlSeCd = schdlSeCd;
        this.schdlKndCd = schdlKndCd;
        this.schdlBgngYmd = schdlBgngYmd;
        this.schdlEndYmd = schdlEndYmd;
        this.schdlPlcNm = schdlPlcNm;
        this.schdlImprtCd = schdlImprtCd;
        this.schdlPicId = schdlPicId;
        this.reptSeCd = reptSeCd;
    }

    public void setSchdlIpAddr(String schdlIpAddr) {
        this.schdlIpAddr = schdlIpAddr;
    }
}
