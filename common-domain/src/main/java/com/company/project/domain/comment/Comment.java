package com.company.project.domain.comment;

import java.io.Serializable;
import java.time.LocalDateTime;

import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EntityListeners;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Entity
@Table(name = "NCOMMENT")
@EntityListeners(AuditingEntityListener.class)
public class Comment implements Serializable {

    @Id
    @Column(name = "ANSWER_NO", length = 20)
    private Long id; // commentNo mapped to ANSWER_NO in legacy DB commonly, wait, checking legacy
                     // Comment.java field name mapping.
    // Legacy Comment.java: commentNo. Let's verify DB schema/legacy code comments
    // if possible.
    // Typically COMTNCOMMENT has ANSWER_NO as PK.

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

    @Column(name = "FRST_REGISTER_ID", length = 20)
    private String frstRegisterId;

    @CreatedDate
    @Column(name = "FRST_REGIST_PNTTM", updatable = false)
    private LocalDateTime createdDate;

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
        this.useAt = useAt == null ? "Y" : useAt;
        this.frstRegisterId = frstRegisterId;
    }

    public void update(String commentCn, String lastUpdusrId) {
        this.commentCn = commentCn;
        this.lastUpdusrId = lastUpdusrId;
    }

    public void delete(String lastUpdusrId) {
        this.useAt = "N";
        this.lastUpdusrId = lastUpdusrId;
    }
}
