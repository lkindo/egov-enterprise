package com.company.project.domain.survey;

import com.company.project.domain.common.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * ??ㅼ뵬????紐??????類ｋ궖 Entity
 * ??뉕탢?????뵠?? NONLINEPOLLIEM
 */
@Entity
@Table(name = "NONLINEPOLLIEM")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class OnlinePollItem extends BaseEntity {

    @Id
    @Column(name = "POLL_IEM_ID", length = 20)
    private String pollIemId;

    @Column(name = "POLL_ID", length = 20, nullable = false)
    private String pollId;

    @Column(name = "POLL_IEM_NM", length = 255, nullable = false)
    private String pollIemNm;

    @Builder
    public OnlinePollItem(String pollIemId, String pollId, String pollIemNm) {
        this.pollIemId = pollIemId;
        this.pollId = pollId;
        this.pollIemNm = pollIemNm;
    }

    public void update(String pollIemNm) {
        this.pollIemNm = pollIemNm;
    }
}
