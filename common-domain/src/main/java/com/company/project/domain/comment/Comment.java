package com.company.project.domain.comment;

import java.io.Serializable;
import java.time.LocalDateTime;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.SQLRestriction;
import org.springframework.data.annotation.CreatedBy;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedBy;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Entity
@Table(name = "NCOMMENT")
@EntityListeners(AuditingEntityListener.class)
@SQLRestriction("use_at = 'Y'")
public class Comment implements Serializable {

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

    @Column(name = "ANSWER", length = 200)
    private String commentCn; // ANSWER in DB

    @Column(name = "USE_AT", length = 1)
    private String useAt;

    @CreatedBy
    @Column(name = "FRST_REGISTER_ID", length = 20, updatable = false)
    private String frstRegisterId;

    @CreatedDate
    @Column(name = "FRST_REGIST_PNTTM", updatable = false)
    private LocalDateTime createdDate;

    @LastModifiedBy
    @Column(name = "LAST_UPDUSR_ID", length = 20)
    private String lastUpdusrId;

    @LastModifiedDate
    @Column(name = "LAST_UPDT_PNTTM")
    private LocalDateTime modifiedDate;

    @Builder
    public Comment(Long id, Long nttId, String bbsId, String wrterId, String wrterNm,
            String password, String commentCn, String useAt, String frstRegisterId) {
        this.id = id;
        this.nttId = nttId;
        this.bbsId = bbsId;
        this.wrterId = wrterId;
        this.wrterNm = wrterNm;
        this.password = password;
        this.commentCn = commentCn;
        this.useAt = useAt;
        this.frstRegisterId = frstRegisterId;
    }

    public void update(String commentCn) {
        this.commentCn = commentCn;
    }

    public void delete() {
        this.useAt = "N";
    }
}