package nuri.business.domain.comment;

import jakarta.persistence.EntityListeners;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;
import java.io.Serializable;
import nuri.business.domain.common.BaseEntity;
import nuri.business.domain.board.Board;
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
@Table(name = "tb_bbs_comment")
@SQLRestriction("use_yn = 'Y'")
public class Comment extends BaseEntity implements Serializable {

    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "answerNoSeq")
    @SequenceGenerator(name = "answerNoSeq", sequenceName = "ANSWER_NO_SEQ", allocationSize = 1)
    @Column(name = "ans_sn")
    private Long ansSn;

    @Column(name = "pst_id", length = 20)
    private String pstId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "pst_id", referencedColumnName = "pst_id", insertable = false, updatable = false,
        foreignKey = @ForeignKey(ConstraintMode.NO_CONSTRAINT))
    private Board board;

    @Column(length = 20)
    private String bbsId;

    @Column(length = 20)
    private String wrterId;

    @Column(length = 100)
    private String wrterNm;

    @Column(length = 200)
    private String pswd;

    @Column(columnDefinition = "TEXT")
    private String ansCn;

    @Column(length = 1)
    @Builder.Default
    private String useYn = "Y";

    public void update(String ansCn) {
        this.ansCn = ansCn;
    }

    public void delete() {
        this.useYn = "N";
    }

    // ----- [Legacy Getter/Setter & Builder Aliases] -----
    // 레거시 별칭 완전 철폐 (표준화 동기화)
}
