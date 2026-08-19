package nuri.business.domain.note;

import nuri.foundation.domain.common.BaseEntity;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.DynamicInsert;
import org.hibernate.annotations.DynamicUpdate;

/**
 * 쪽지 발신 엔티티 (tb_note_sndng)
 *
 * <p>[Phase 5.2 규범] 클래스 레벨 Lombok 생성자/빌더를 제거하고 빌더는 정적 팩토리 {@link #create}에 @Builder 배치.
 * 연관(note)은 빌더로 설정하므로 팩토리 파라미터에 포함. 감사 필드는 표준 Auditing에 위임.
 * 기존 package 호출부 호환은 명시적 package-private 생성자가 유지한다.
 */
@Entity
@Table(name = "tb_note_sndng")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@DynamicInsert
@DynamicUpdate
public class NoteTrnsmit extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long noteSndngSn;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "note_sn")
    private Note note;

    @Column(length = 20)
    private String sndrId;

    @Column(length = 1)
    private String delYn;

    NoteTrnsmit(Long noteSndngSn, Note note, String sndrId, String delYn) {
        this.noteSndngSn = noteSndngSn;
        this.note = note;
        this.sndrId = sndrId;
        this.delYn = delYn;
    }

    @Builder
    public static NoteTrnsmit create(Long noteSndngSn, Note note, String sndrId, String delYn) {
        return new NoteTrnsmit(noteSndngSn, note, sndrId, delYn);
    }

    /** 발신자 논리삭제(발신함에서 숨김). 수신 사본과 독립. */
    public void markDeleted() {
        this.delYn = "Y";
    }

    @PrePersist
    protected void onCreate() {
        if (this.delYn == null)
            this.delYn = "N";
    }
}
