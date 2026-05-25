package nuri.business.domain.schedule;

import nuri.foundation.domain.common.BaseEntity;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.io.Serializable;

@Entity
@Table(name = "tb_leader_schdl")
@Getter
@Setter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@SuperBuilder
@EntityListeners(AuditingEntityListener.class)
public class LeaderSchedule extends BaseEntity implements Serializable {
    private static final long serialVersionUID = 1L;

    @Id
    @Column(name = "schdl_id", length = 20)
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
