package nuri.business.domain.schedule;

import nuri.foundation.domain.common.BaseEntity;
import jakarta.persistence.*;
import lombok.*;

import java.io.Serializable;

/**
 * 일정 엔티티 (tb_schdl_info)
 *
 * <p>[Phase 5.2 규범] 클래스 레벨 Lombok 생성자/빌더를 제거하고 빌더는 정적 팩토리
 * {@link #create}에 @Builder 배치. 기존 package 호출부 호환은 명시적 package-private 생성자가 유지한다.
 */
@Entity
@Table(name = "tb_schdl_info")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Schedule extends BaseEntity implements Serializable {
    private static final long serialVersionUID = 1L;

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long schdlSn;

    @Column(length = 12)
    private String schdlSeCd;

    @Column(length = 100, nullable = false)
    private String schdlNm;

    @Column(length = 4000)
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

    // [V2_13] varchar(30)→20 정렬: 파일 마스터 PK(atch_file_sn varchar(20))와 도메인 일치 (기존 값 0건 실측)
    private Long atchFileSn;

    // Additional fields used in service
    @Column(length = 20)
    private String schdlDeptId;
    @Column(length = 12)
    private String schdlKndCd;
    @Column(length = 100)
    private String schdlPlcNm;
    @Column(length = 12)
    private String schdlImprtCd;

    Schedule(Long schdlSn, String schdlSeCd, String schdlNm, String schdlCn, String reptSeCd,
            String schdlBgngYmd, String schdlEndYmd, String schdlIpAddr, String schdlPicId, Long atchFileSn,
            String schdlDeptId, String schdlKndCd, String schdlPlcNm, String schdlImprtCd) {
        this.schdlSn = schdlSn;
        this.schdlSeCd = schdlSeCd;
        this.schdlNm = schdlNm;
        this.schdlCn = schdlCn;
        this.reptSeCd = reptSeCd;
        this.schdlBgngYmd = schdlBgngYmd;
        this.schdlEndYmd = schdlEndYmd;
        this.schdlIpAddr = schdlIpAddr;
        this.schdlPicId = schdlPicId;
        this.atchFileSn = atchFileSn;
        this.schdlDeptId = schdlDeptId;
        this.schdlKndCd = schdlKndCd;
        this.schdlPlcNm = schdlPlcNm;
        this.schdlImprtCd = schdlImprtCd;
    }

    /**
     * 일정 생성 정적 팩토리(빌더 진입점). {@code Schedule.builder()...build()} 호출부는 그대로 동작한다.
     */
    @Builder
    public static Schedule create(Long schdlSn, String schdlSeCd, String schdlNm, String schdlCn, String reptSeCd,
            String schdlBgngYmd, String schdlEndYmd, String schdlIpAddr, String schdlPicId, Long atchFileSn,
            String schdlDeptId, String schdlKndCd, String schdlPlcNm, String schdlImprtCd) {
        return new Schedule(schdlSn, schdlSeCd, schdlNm, schdlCn, reptSeCd, schdlBgngYmd, schdlEndYmd, schdlIpAddr,
                schdlPicId, atchFileSn, schdlDeptId, schdlKndCd, schdlPlcNm, schdlImprtCd);
    }

    public void update(String schdlNm, String schdlCn, String schdlSeCd, String schdlBgngYmd, String schdlEndYmd,
                       String reptSeCd, String schdlPicId, Long atchFileSn) {
        this.schdlNm = schdlNm;
        this.schdlCn = schdlCn;
        this.schdlSeCd = schdlSeCd;
        this.schdlBgngYmd = schdlBgngYmd;
        this.schdlEndYmd = schdlEndYmd;
        this.reptSeCd = reptSeCd;
        this.schdlPicId = schdlPicId;
        this.atchFileSn = atchFileSn;
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
