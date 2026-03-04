package com.company.project.domain.survey;

import com.company.project.domain.common.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.OneToMany;
import jakarta.persistence.CascadeType;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.util.ArrayList;
import java.util.List;

/**
 * ??ㅼ뵬????紐??온???類ｋ궖 Entity
 * ??뉕탢?????뵠?? NONLINEPOLLMANAGE
 */
@Entity
@Table(name = "NONLINEPOLLMANAGE")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class OnlinePollManage extends BaseEntity {

    @Id
    @Column(name = "POLL_ID", length = 20)
    private String pollId;

    @Column(name = "POLL_NM", length = 255, nullable = false)
    private String pollNm;

    @Column(name = "POLL_BGNDE", length = 10)
    private String pollBeginDe;

    @Column(name = "POLL_ENDDE", length = 10)
    private String pollEndDe;

    @Column(name = "POLL_KND", length = 20)
    private String pollKindCode;

    @Column(name = "POLL_DSUSE_ENNC", length = 1)
    private String pollDsuseYn;

    @Column(name = "POLL_ATMC_DSUSE_ENNC", length = 1)
    private String pollAutoDsuseYn;

    @OneToMany(mappedBy = "pollId", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<OnlinePollItem> pollItems = new ArrayList<>();

    @Builder
    public OnlinePollManage(String pollId, String pollNm, String pollBeginDe, String pollEndDe,
            String pollKindCode, String pollDsuseYn, String pollAutoDsuseYn, String frstRegisterId) {
        this.pollId = pollId;
        this.pollNm = pollNm;
        this.pollBeginDe = pollBeginDe;
        this.pollEndDe = pollEndDe;
        this.pollKindCode = pollKindCode;
        this.pollDsuseYn = pollDsuseYn != null ? pollDsuseYn : "N";
        this.pollAutoDsuseYn = pollAutoDsuseYn != null ? pollAutoDsuseYn : "N";
        this.createdBy = frstRegisterId;
    }

    public void update(String pollNm, String pollBeginDe, String pollEndDe, String pollKindCode,
            String pollDsuseYn, String pollAutoDsuseYn) {
        this.update(pollNm, pollBeginDe, pollEndDe, pollKindCode, pollDsuseYn, pollAutoDsuseYn, null);
    }

    public void update(String pollNm, String pollBeginDe, String pollEndDe, String pollKindCode,
            String pollDsuseYn, String pollAutoDsuseYn, String userId) {
        this.pollNm = pollNm;
        this.pollBeginDe = pollBeginDe;
        this.pollEndDe = pollEndDe;
        this.pollKindCode = pollKindCode;
        this.pollDsuseYn = pollDsuseYn;
        this.pollAutoDsuseYn = pollAutoDsuseYn;
        if (userId != null) {
            this.lastModifiedBy = userId;
        }
    }
}