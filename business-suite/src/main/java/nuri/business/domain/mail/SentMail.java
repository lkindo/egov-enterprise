package nuri.business.domain.mail;

import nuri.business.domain.common.BaseEntity;
import jakarta.persistence.EntityListeners;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;
import lombok.experimental.SuperBuilder;
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
@SuperBuilder
public class SentMail extends BaseEntity {

    @Id
    @Column(name = "msg_id", length = 20)
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

    // ----- [Legacy Getter Aliases for Backwards Compatibility] -----

    public String getMssageId() { return this.msgId; }
    public String getSj() { return this.emlTtl; }
    public String getEmailCn() { return this.emlCn; }
    public String getDsptchPerson() { return this.sndptyNm; }
    public String getRecptnPerson() { return this.rcvrNm; }
    public String getSndngResultCode() { return this.dsptchRsltCd; }
    public java.time.LocalDateTime getSndngDe() { return this.dsptchDt; }

    // ----- [Custom Builder Extension for Backwards Compatibility] -----

    public static abstract class SentMailBuilder<C extends SentMail, B extends SentMailBuilder<C, B>> extends BaseEntityBuilder<C, B> {
        public B mssageId(String mssageId) {
            this.msgId = mssageId;
            return self();
        }
        public B sj(String sj) {
            this.emlTtl = sj;
            return self();
        }
        public B emailCn(String emailCn) {
            this.emlCn = emailCn;
            return self();
        }
        public B dsptchPerson(String dsptchPerson) {
            this.sndptyNm = dsptchPerson;
            return self();
        }
        public B recptnPerson(String recptnPerson) {
            this.rcvrNm = recptnPerson;
            return self();
        }
        public B sndngResultCode(String sndngResultCode) {
            this.dsptchRsltCd = sndngResultCode;
            return self();
        }
        public B sndngDe(java.time.LocalDateTime sndngDe) {
            this.dsptchDt = sndngDe;
            return self();
        }
    }

    public SentMail(String mssageId, String sj, String emailCn, String dsptchPerson,
            String recptnPerson, String sndngResultCode, String atchFileId) {
        this.msgId = mssageId;
        this.emlTtl = sj;
        this.emlCn = emailCn;
        this.sndptyNm = dsptchPerson;
        this.rcvrNm = recptnPerson;
        this.dsptchRsltCd = sndngResultCode;
        this.dsptchDt = java.time.LocalDateTime.now();
        this.atchFileId = atchFileId;
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
