package nuri.business.domain.schedule;

import nuri.business.domain.common.BaseEntity;
import jakarta.persistence.*;
import lombok.*;

import java.io.Serializable;

/**
 * 간부 일정 엔티티 (tb_leader_schdl)
 *
 * <p>[Phase 5.2 규범] 클래스 레벨 @SuperBuilder 제거, 빌더는 정적 팩토리 {@link #create}에 @Builder 배치.
 * (@AllArgsConstructor 는 {@code new LeaderSchedule(...)} 호출부가 존재하여 유지하고, create() 가 이를 위임)
 */
@Entity
@Table(name = "tb_leader_schdl")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
public class LeaderSchedule extends BaseEntity implements Serializable {
    private static final long serialVersionUID = 1L;

    @Id
    @Column(length = 20)
    private String schdlId;

    @Column(length = 12)
    private String schdlSeCd;

    @Column(length = 20, nullable = false)
    private String leaderId;

    @Column(length = 100, nullable = false)
    private String schdlNm;

    @Column(columnDefinition = "TEXT", length = 4000)
    private String schdlCn;

    @Column(length = 12)
    private String reptSeCd;

    @Column(length = 12)
    private String schdlImprtCd;

    @Column(length = 8)
    private String schdlBgngYmd;

    @Column(length = 8)
    private String schdlEndYmd;

    @Column(length = 20)
    private String schdlPicId;

    @Column(length = 100)
    private String schdlPlcNm;

    /**
     * 간부 일정 생성 정적 팩토리(빌더 진입점). {@code LeaderSchedule.builder()...build()} 호출부는 그대로 동작한다.
     */
    @Builder
    public static LeaderSchedule create(String schdlId, String schdlSeCd, String leaderId, String schdlNm,
            String schdlCn, String reptSeCd, String schdlImprtCd, String schdlBgngYmd, String schdlEndYmd,
            String schdlPicId, String schdlPlcNm) {
        return new LeaderSchedule(schdlId, schdlSeCd, leaderId, schdlNm, schdlCn, reptSeCd, schdlImprtCd,
                schdlBgngYmd, schdlEndYmd, schdlPicId, schdlPlcNm);
    }

    public void update(String schdlSeCd, String leaderId, String schdlNm, String schdlCn,
                       String reptSeCd, String schdlImprtCd, String schdlBgngYmd, String schdlEndYmd, String schdlPicId, String schdlPlcNm) {
        this.schdlSeCd = schdlSeCd;
        this.leaderId = leaderId;
        this.schdlNm = schdlNm;
        this.schdlCn = schdlCn;
        this.reptSeCd = reptSeCd;
        this.schdlImprtCd = schdlImprtCd;
        this.schdlBgngYmd = schdlBgngYmd;
        this.schdlEndYmd = schdlEndYmd;
        this.schdlPicId = schdlPicId;
        this.schdlPlcNm = schdlPlcNm;
    }
}
