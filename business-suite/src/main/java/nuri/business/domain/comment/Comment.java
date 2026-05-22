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

    @Column(name = "bbs_id", length = 20)
    private String bbsId;

    @Column(name = "wrter_id", length = 20)
    @com.fasterxml.jackson.annotation.JsonProperty("writerId")
    private String wrterId;

    @Column(name = "wrter_nm", length = 100)
    @com.fasterxml.jackson.annotation.JsonProperty("writerNm")
    private String wrterNm;

    @Column(name = "pswd", length = 200)
    @com.fasterxml.jackson.annotation.JsonProperty("password")
    private String pswd;

    @Column(name = "ans_cn", columnDefinition = "TEXT")
    private String ansCn;

    @Column(name = "use_yn", length = 1)
    @Builder.Default
    private String useYn = "Y";

    public void update(String ansCn) {
        this.ansCn = ansCn;
    }

    public void delete() {
        this.useYn = "N";
    }

    // ----- [Legacy Getter/Setter & Builder Aliases] -----

    public String getWriterId() { return this.wrterId; }
    public void setWriterId(String v) { this.wrterId = v; }

    public String getWriterNm() { return this.wrterNm; }
    public void setWriterNm(String v) { this.wrterNm = v; }

    public String getPassword() { return this.pswd; }
    public void setPassword(String v) { this.pswd = v; }

    public Long getAnswerNo() { return ansSn; }
    public void setAnswerNo(Long v) { this.ansSn = v; }
    public String getNttId() { return pstId; }
    public void setNttId(String v) { this.pstId = v; }
    public String getCmntCn() { return ansCn; }
    public void setCmntCn(String v) { this.ansCn = v; }

    public Long getId() { return ansSn; }
    public void setId(Long v) { this.ansSn = v; }

    public static abstract class CommentBuilder<C extends Comment, B extends CommentBuilder<C, B>> extends BaseEntityBuilder<C, B> {
        private String wrterId;
        private String wrterNm;
        private String pswd;

        public B writerId(String writerId) {
            this.wrterId = writerId;
            return self();
        }
        public B writerNm(String writerNm) {
            this.wrterNm = writerNm;
            return self();
        }
        public B password(String password) {
            this.pswd = password;
            return self();
        }
    }
}
