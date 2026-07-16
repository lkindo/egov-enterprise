package nuri.business.domain.system.service.consult;

import java.time.LocalDateTime;
import nuri.foundation.domain.common.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Builder;

@Entity
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Table(name = "tb_dscsn_list")
public class CnsltManage extends BaseEntity {

    @Id
    @Column(length = 20)
    private String dscsnId;

    @Column(length = 100)
    private String dscsnTtl;

    @Column(columnDefinition = "TEXT", length = 4000)
    private String dscsnCn;

    @Column(length = 1)
    private String rlsYn;

    @Column(length = 200)
    private String wrtPswd;

    @Column(length = 4)
    private String areaNo;

    @Column(length = 4)
    private String mdTelno;

    @Column(length = 4)
    private String endTelno;

    @Column(length = 4)
    private String mblFrstTelno;

    @Column(length = 4)
    private String mblMdTelno;

    @Column(length = 4)
    private String mblEndTelno;

    @Column(length = 100)
    private String emlAddr;

    @Column(length = 1)
    private String emlAnsYn;

    @Column(length = 100)
    private String wrterNm;

    @Column(length = 20)
    private String wrtYmd;

    @Column
    private Integer inqCnt = 0;

    @Column(length = 12)
    private String qnaProcSttsCd = "1";

    @Column(length = 20)
    private String atchFileId;

    @Column(columnDefinition = "TEXT", length = 4000)
    private String procCn;

    @Column(length = 20)
    private String mngYmd;

    // 팩토리 위임 대상 생성자. @Builder.Default 기본값(inqCnt=0, qnaProcSttsCd="1")을 널병합으로 재현한다.
    private CnsltManage(String dscsnId, String dscsnTtl, String dscsnCn, String rlsYn,
            String wrtPswd, String areaNo, String mdTelno, String endTelno, String mblFrstTelno,
            String mblMdTelno, String mblEndTelno, String emlAddr, String emlAnsYn, String wrterNm,
            String wrtYmd, Integer inqCnt, String qnaProcSttsCd, String atchFileId, String procCn,
            String mngYmd) {
        this.dscsnId = dscsnId;
        this.dscsnTtl = dscsnTtl;
        this.dscsnCn = dscsnCn;
        this.rlsYn = rlsYn;
        this.wrtPswd = wrtPswd;
        this.areaNo = areaNo;
        this.mdTelno = mdTelno;
        this.endTelno = endTelno;
        this.mblFrstTelno = mblFrstTelno;
        this.mblMdTelno = mblMdTelno;
        this.mblEndTelno = mblEndTelno;
        this.emlAddr = emlAddr;
        this.emlAnsYn = emlAnsYn;
        this.wrterNm = wrterNm;
        this.wrtYmd = wrtYmd;
        this.inqCnt = inqCnt != null ? inqCnt : 0;
        this.qnaProcSttsCd = qnaProcSttsCd != null ? qnaProcSttsCd : "1";
        this.atchFileId = atchFileId;
        this.procCn = procCn;
        this.mngYmd = mngYmd;
    }

    // Phase 5.2: 클래스 레벨 빌더 대신 정적 팩토리에 @Builder 배치. 기존 CnsltManage.builder()...build() 호출부 호환 유지.
    @Builder
    public static CnsltManage create(String dscsnId, String dscsnTtl, String dscsnCn, String rlsYn,
            String wrtPswd, String areaNo, String mdTelno, String endTelno, String mblFrstTelno,
            String mblMdTelno, String mblEndTelno, String emlAddr, String emlAnsYn, String wrterNm,
            String wrtYmd, Integer inqCnt, String qnaProcSttsCd, String atchFileId, String procCn,
            String mngYmd) {
        return new CnsltManage(dscsnId, dscsnTtl, dscsnCn, rlsYn, wrtPswd, areaNo, mdTelno,
                endTelno, mblFrstTelno, mblMdTelno, mblEndTelno, emlAddr, emlAnsYn, wrterNm, wrtYmd,
                inqCnt, qnaProcSttsCd, atchFileId, procCn, mngYmd);
    }

    public void update(String dscsnTtl, String dscsnCn, String rlsYn, String wrtPswd,
            String areaNo, String mdTelno, String endTelno, String mblFrstTelno, String mblMdTelno,
            String mblEndTelno,
            String emlAddr, String emlAnsYn, String wrterNm, String atchFileId) {
        this.dscsnTtl = dscsnTtl;
        this.dscsnCn = dscsnCn;
        this.rlsYn = rlsYn;
        this.wrtPswd = wrtPswd;
        this.areaNo = areaNo;
        this.mdTelno = mdTelno;
        this.endTelno = endTelno;
        this.mblFrstTelno = mblFrstTelno;
        this.mblMdTelno = mblMdTelno;
        this.mblEndTelno = mblEndTelno;
        this.emlAddr = emlAddr;
        this.emlAnsYn = emlAnsYn;
        this.wrterNm = wrterNm;
        this.atchFileId = atchFileId;
    }

    public void incrementInqireCo() {
        this.inqCnt = (this.inqCnt == null ? 0 : this.inqCnt) + 1;
    }

    public void updateAnswer(String qnaProcSttsCd, String procCn) {
        this.qnaProcSttsCd = qnaProcSttsCd;
        this.procCn = procCn;
        this.mngYmd = LocalDateTime.now().toString();
    }
}
