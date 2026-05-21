package nuri.business.domain.mail;

import nuri.foundation.domain.common.BaseEntity;
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
    private String mssageId;

    @Column(name = "eml_ttl", length = 100, nullable = false)
    private String sj;

    @Column(name = "eml_cn", length = 4000)
    private String emailCn;

    @Column(name = "sndpty_nm", length = 100)
    private String dsptchPerson;

    @Column(name = "rcvr_nm", length = 100)
    private String recptnPerson;

    @Column(name = "dsptch_rslt_cd", length = 12)
    private String sndngResultCode;

    @Column(name = "dsptch_dt")
    private java.time.LocalDateTime sndngDe;

    @Column(name = "atch_file_id", length = 20)
    private String atchFileId;

    public SentMail(String mssageId, String sj, String emailCn, String dsptchPerson,
            String recptnPerson, String sndngResultCode, String atchFileId) {
        this.mssageId = mssageId;
        this.sj = sj;
        this.emailCn = emailCn;
        this.dsptchPerson = dsptchPerson;
        this.recptnPerson = recptnPerson;
        this.sndngResultCode = sndngResultCode;
        this.sndngDe = java.time.LocalDateTime.now();
        this.atchFileId = atchFileId;
    }

    @jakarta.persistence.PrePersist
    protected void onCreate() {
        if (this.sndngDe == null) {
            this.sndngDe = java.time.LocalDateTime.now();
        }
    }

    public void updateResult(String sndngResultCode) {
        this.sndngResultCode = sndngResultCode;
    }
}
