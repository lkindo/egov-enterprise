package nuri.business.domain.mail;

import nuri.foundation.domain.common.BaseEntity;
import lombok.Builder;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * 발송 메일 정보 엔티티 (HEMAILDSPTCHMANAGE 테이블 매핑)
 * [Cleanup] 한글 인코딩 복구 및 감사 필드 표준화
 */
@Entity
@Table(name = "tb_email_dsptch_manage")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class SentMail extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long emlDsptchSn;

    @Column(length = 256, nullable = false)
    private String emlTtl;

    @Column(length = 4000)
    private String emlCn;

    @Column(length = 100)
    private String sndptyNm;

    @Column(length = 100)
    private String rcvrNm;

    /**
     * 사용자 수신자의 esntlId(2026-09-26 DIP B5 F7). 이력은 주소를 저장하지 않으므로(DEC-OPS-134) 재발송은 이 값으로
     * 현재 등록 주소를 다시 해석한다. 직접 입력한 주소 수신자와 이 변경 전의 행은 null 이다.
     */
    @Column(length = 20)
    private String rcvrId;

    @Column(length = 12)
    private String dsptchRsltCd;

    private java.time.LocalDateTime dsptchDt;
    @Column(name = "atch_file_sn")
    private Long atchFileSn;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "atch_file_sn", referencedColumnName = "atch_file_sn", insertable = false, updatable = false,
        foreignKey = @ForeignKey(ConstraintMode.NO_CONSTRAINT))
    private nuri.business.domain.file.FileMaster fileMaster;



    private SentMail(Long emlDsptchSn, String emlTtl, String emlCn, String sndptyNm,
            String rcvrNm, String rcvrId, String dsptchRsltCd, Long atchFileSn) {
        this.emlDsptchSn = emlDsptchSn;
        this.emlTtl = emlTtl;
        this.emlCn = emlCn;
        this.sndptyNm = sndptyNm;
        this.rcvrNm = rcvrNm;
        this.rcvrId = rcvrId;
        this.dsptchRsltCd = dsptchRsltCd;
        this.atchFileSn = atchFileSn;
    }

    @Builder
    public static SentMail create(Long emlDsptchSn, String emlTtl, String emlCn, String sndptyNm,
            String rcvrNm, String rcvrId, String dsptchRsltCd, Long atchFileSn) {
        return new SentMail(emlDsptchSn, emlTtl, emlCn, sndptyNm, rcvrNm, rcvrId, dsptchRsltCd, atchFileSn);
    }

    @jakarta.persistence.PrePersist
    protected void onCreate() {
        if (this.dsptchDt == null) {
            this.dsptchDt = java.time.LocalDateTime.now();
        }
    }

    public void updateResult(String sndngResultCode) {
        this.dsptchRsltCd = sndngResultCode;
    }
}
