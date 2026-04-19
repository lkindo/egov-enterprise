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
 * 게시물 댓글 엔티티
 * [Consistency Fix] 댓글 내용(answer) 용량 확장 (TEXT)
 */
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@SuperBuilder
@EntityListeners(AuditingEntityListener.class)
@Entity
@Table(name = "NCOMMENT")
@SQLRestriction("use_at = 'Y'")
public class Comment extends BaseEntity implements Serializable {

    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "answerNoSeq")
    @SequenceGenerator(name = "answerNoSeq", sequenceName = "ANSWER_NO_SEQ", allocationSize = 1)
    @Column(name = "ANSWER_NO")
    private Long id;

    @Column(name = "NTT_ID")
    private Long nttId;

    @Column(name = "BBS_ID", length = 20)
    private String bbsId;

    @Column(name = "WRTER_ID", length = 20)
    private String wrterId;

    @Column(name = "WRTER_NM", length = 20)
    private String wrterNm;

    @Column(name = "PASSWORD", length = 200)
    private String password;

    @Column(name = "ANSWER", columnDefinition = "TEXT")
    private String commentCn;

    @Column(name = "USE_AT", length = 1)
    private String useAt;

    public void update(String commentCn) {
        this.commentCn = commentCn;
    }

    public void delete() {
        this.useAt = "N";
    }
}
