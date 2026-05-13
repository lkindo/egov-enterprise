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
@Table(name = "TB_EMAIL_DSPTCH_MANAGE")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@SuperBuilder
public class SentMail extends BaseEntity {

    @Id
    @Column(name = "MSSAGE_ID", length = 20)
    private String mssageId;

    @Column(name = "SJ", length = 255, nullable = false)
    private String sj;

    @Column(name = "EMAIL_CN", length = 4000)
    private String emailCn;

    @Column(name = "SNDR", length = 100)
    private String dsptchPerson;

    @Column(name = "RCVER", length = 100)
    private String recptnPerson;

    @Column(name = "SNDNG_RESULT_CODE", length = 20)
    private String sndngResultCode;

    @Column(name = "DSPTCH_DT", length = 20)
    private String sndngDe;

    @Column(name = "ATCH_FILE_ID", length = 20)
    private String atchFileId;

    public SentMail(String mssageId, String sj, String emailCn, String dsptchPerson,
            String recptnPerson, String sndngResultCode, String atchFileId) {
        this.mssageId = mssageId;
        this.sj = sj;
        this.emailCn = emailCn;
        this.dsptchPerson = dsptchPerson;
        this.recptnPerson = recptnPerson;
        this.sndngResultCode = sndngResultCode;
        this.sndngDe = java.time.LocalDateTime.now()
                .format(java.time.format.DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss"));
        this.atchFileId = atchFileId;
    }

    public void updateResult(String sndngResultCode) {
        this.sndngResultCode = sndngResultCode;
    }
}
