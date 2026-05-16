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
    @Column(name = "ANSWER_NO")
    private Long answerNo;

    @Column(name = "NTT_ID")
    private Long nttId;

    @Column(name = "BBS_ID", length = 20)
    private String bbsId;

    @Column(name = "WRTER_ID", length = 20)
    private String writerId;

    @Column(name = "WRTER_NM", length = 20)
    private String writerNm;

    @Column(name = "PASSWORD", length = 200)
    private String password;

    @Column(name = "ANSWER", columnDefinition = "TEXT")
    private String cmntCn;

    @Column(name = "USE_AT", length = 1)
    private String useYn;

    public void update(String cmntCn) {
        this.cmntCn = cmntCn;
    }

    public void delete() {
        this.useYn = "N";
    }

    // legacy / missing aliases
    public Long getId() { return answerNo; }
    public void setId(Long v) { this.answerNo = v; }
    public Long getPstId() { return nttId; }
    public void setPstId(Long v) { this.nttId = v; }
}
