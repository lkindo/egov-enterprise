package com.company.project.domain.meeting;

import java.time.LocalDateTime;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Table(name = "NMTGINFO")
public class MeetingManage {

    @Id
    @Column(name = "MTG_ID", length = 20)
    private String mtgId;

    @Column(name = "MTG_NM", length = 255)
    private String mtgNm;

    @Column(name = "MTG_MTR_CN", length = 1000)
    private String mtgMtrCn;

    @Column(name = "MTG_SN")
    private Integer mtgSn;

    @Column(name = "MTG_CO")
    private Integer mtgCo;

    @Column(name = "MTG_DE", length = 8)
    private String mtgDe;

    @Column(name = "MTG_PLACE", length = 255)
    private String mtgPlace;

    @Column(name = "MTG_BEGIN_TM", length = 5)
    private String mtgBeginTm;

    @Column(name = "MTG_END_TM", length = 5)
    private String mtgEndTime;

    @Column(name = "CLSDR_MTG_AT", length = 1)
    private String clsdrMtgAt;

    @Column(name = "READNG_BGNDE", length = 8)
    private String readngBgnde;

    @Column(name = "READNG_AT", length = 1)
    private String readngAt;

    @Column(name = "MTG_RESULT_CN", length = 1000)
    private String mtgResultCn;

    @Column(name = "MTG_RESULT_ENNC", length = 1)
    private String mtgResultEnnc;

    @Column(name = "ETC_MATTER", length = 1000)
    private String etcMatter;

    @Column(name = "MNGT_DEPT_ID", length = 20)
    private String mngtDeptId;

    @Column(name = "MNAER_ID", length = 20)
    private String mnaerId;

    @Column(name = "MNAER_DEPT_ID", length = 20)
    private String mnaerDeptId;

    @Column(name = "MTG_AT", length = 1)
    private String mtgAt;

    @Column(name = "NONATDRN_CO")
    private Integer nonatdrnCo;

    @Column(name = "ATDRN_CO")
    private Integer atdrnCo;

    @Column(name = "FRST_REGIST_PNTTM")
    private LocalDateTime frstRegisterPnttm;

    @Column(name = "FRST_REGISTER_ID", length = 20)
    private String frstRegisterId;

    @Column(name = "LAST_UPDT_PNTTM")
    private LocalDateTime lastUpdusrPnttm;

    @Column(name = "LAST_UPDUSR_ID", length = 20)
    private String lastUpdusrId;

    @Builder
    public MeetingManage(String mtgId, String mtgNm, String mtgMtrCn, Integer mtgSn, Integer mtgCo, String mtgDe,
            String mtgPlace, String mtgBeginTm, String mtgEndTime, String clsdrMtgAt, String readngBgnde,
            String readngAt,
            String mtgResultCn, String mtgResultEnnc, String etcMatter, String mngtDeptId, String mnaerId,
            String mnaerDeptId, String mtgAt, Integer nonatdrnCo, Integer atdrnCo, String frstRegisterId) {
        this.mtgId = mtgId;
        this.mtgNm = mtgNm;
        this.mtgMtrCn = mtgMtrCn;
        this.mtgSn = mtgSn;
        this.mtgCo = mtgCo;
        this.mtgDe = mtgDe;
        this.mtgPlace = mtgPlace;
        this.mtgBeginTm = mtgBeginTm;
        this.mtgEndTime = mtgEndTime;
        this.clsdrMtgAt = clsdrMtgAt;
        this.readngBgnde = readngBgnde;
        this.readngAt = readngAt;
        this.mtgResultCn = mtgResultCn;
        this.mtgResultEnnc = mtgResultEnnc;
        this.etcMatter = etcMatter;
        this.mngtDeptId = mngtDeptId;
        this.mnaerId = mnaerId;
        this.mnaerDeptId = mnaerDeptId;
        this.mtgAt = mtgAt;
        this.nonatdrnCo = nonatdrnCo;
        this.atdrnCo = atdrnCo;
        this.frstRegisterId = frstRegisterId;
        this.frstRegisterPnttm = LocalDateTime.now();
    }

    public void update(String mtgNm, String mtgMtrCn, Integer mtgSn, Integer mtgCo, String mtgDe, String mtgPlace,
            String mtgBeginTm, String mtgEndTime, String clsdrMtgAt, String readngBgnde, String readngAt,
            String mtgResultCn, String mtgResultEnnc, String etcMatter, String mngtDeptId, String mnaerId,
            String mnaerDeptId, String mtgAt, Integer nonatdrnCo, Integer atdrnCo, String lastUpdusrId) {
        this.mtgNm = mtgNm;
        this.mtgMtrCn = mtgMtrCn;
        this.mtgSn = mtgSn;
        this.mtgCo = mtgCo;
        this.mtgDe = mtgDe;
        this.mtgPlace = mtgPlace;
        this.mtgBeginTm = mtgBeginTm;
        this.mtgEndTime = mtgEndTime;
        this.clsdrMtgAt = clsdrMtgAt;
        this.readngBgnde = readngBgnde;
        this.readngAt = readngAt;
        this.mtgResultCn = mtgResultCn;
        this.mtgResultEnnc = mtgResultEnnc;
        this.etcMatter = etcMatter;
        this.mngtDeptId = mngtDeptId;
        this.mnaerId = mnaerId;
        this.mnaerDeptId = mnaerDeptId;
        this.mtgAt = mtgAt;
        this.nonatdrnCo = nonatdrnCo;
        this.atdrnCo = atdrnCo;
        this.lastUpdusrId = lastUpdusrId;
        this.lastUpdusrPnttm = LocalDateTime.now();
    }
}