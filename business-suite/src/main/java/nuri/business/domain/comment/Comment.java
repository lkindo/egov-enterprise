package nuri.business.domain.comment;

import jakarta.persistence.EntityListeners;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;
import java.io.Serializable;
import nuri.foundation.domain.common.BaseEntity;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;
import org.hibernate.annotations.SQLRestriction;

/**
 * 게시물 댓글 엔티티 (v5 standardized)
 * - DB Schema Sync: TB_BBS_COMMENT (ans_sn, pst_id, bbs_id, wrter_id, wrter_nm, pswd, ans_cn, use_yn)
 */
@Getter
@Setter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@SuperBuilder
@EntityListeners(AuditingEntityListener.class)
@Entity
@Table(name = "TB_BBS_COMMENT")
@SQLRestriction("use_yn = 'Y'")
public class Comment extends BaseEntity implements Serializable {

    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "answerNoSeq")
    @SequenceGenerator(name = "answerNoSeq", sequenceName = "ANSWER_NO_SEQ", allocationSize = 1)
    @Column(name = "ANS_SN")
    private Long ansSn;

    @Column(name = "PST_ID", length = 20)
    private String pstId;

    @Column(name = "BBS_ID", length = 20)
    private String bbsId;

    @Column(name = "WRTER_ID", length = 20)
    private String writerId;

    @Column(name = "WRTER_NM", length = 20)
    private String writerNm;

    @Column(name = "PSWD", length = 200)
    private String password;

    @Column(name = "ANS_CN", columnDefinition = "TEXT")
    private String ansCn;

    @Column(name = "USE_YN", length = 1)
    @Builder.Default
    private String useYn = "Y";

    public void update(String ansCn) {
        this.ansCn = ansCn;
    }

    public void delete() {
        this.useYn = "N";
    }

    // aliases for backward compatibility and mapping
    public Long getAnswerNo() { return ansSn; }
    public void setAnswerNo(Long v) { this.ansSn = v; }
    public String getNttId() { return pstId; }
    public void setNttId(String v) { this.pstId = v; }
    public String getCmntCn() { return ansCn; }
    public void setCmntCn(String v) { this.ansCn = v; }

    public Long getId() { return ansSn; }
    public void setId(Long v) { this.ansSn = v; }
}
