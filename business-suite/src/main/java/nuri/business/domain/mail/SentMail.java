package nuri.business.domain.mail;

import nuri.business.domain.common.BaseEntity;
import jakarta.persistence.EntityListeners;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;
import lombok.Builder;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * 발송 메일 정보 엔티티 (HEMAILDSPTCHMANAGE 테이블 매핑)
 * [Cleanup] 한글 인코딩 복구 및 감사 필드 표준화
 */
@EntityListeners(AuditingEntityListener.class)
@Entity
@Table(name = "tb_email_dsptch_manage")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class SentMail extends BaseEntity {

    @Id
    @Column(length = 20)
    private String msgId;

    @Column(length = 100, nullable = false)
    private String emlTtl;

    @Column(length = 4000)
    private String emlCn;

    @Column(length = 100)
    private String sndptyNm;

    @Column(length = 100)
    private String rcvrNm;

    @Column(length = 12)
    private String dsptchRsltCd;

    private java.time.LocalDateTime dsptchDt;

    @Column(name = "atch_file_id", length = 20)
    private String atchFileId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "atch_file_id", referencedColumnName = "atch_file_id", insertable = false, updatable = false,
        foreignKey = @ForeignKey(ConstraintMode.NO_CONSTRAINT))
    private nuri.business.domain.file.FileMaster fileMaster;



    private SentMail(String msgId, String emlTtl, String emlCn, String sndptyNm,
            String rcvrNm, String dsptchRsltCd, String atchFileId) {
        this.msgId = msgId;
        this.emlTtl = emlTtl;
        this.emlCn = emlCn;
        this.sndptyNm = sndptyNm;
        this.rcvrNm = rcvrNm;
        this.dsptchRsltCd = dsptchRsltCd;
        this.atchFileId = atchFileId;
    }

    @Builder
    public static SentMail create(String msgId, String emlTtl, String emlCn, String sndptyNm,
            String rcvrNm, String dsptchRsltCd, String atchFileId) {
        return new SentMail(msgId, emlTtl, emlCn, sndptyNm, rcvrNm, dsptchRsltCd, atchFileId);
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
