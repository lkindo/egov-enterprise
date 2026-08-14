package nuri.business.domain.note;

import nuri.foundation.domain.common.BaseEntity;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.DynamicInsert;
import org.hibernate.annotations.DynamicUpdate;

/**
 * 쪽지 발신 엔티티 (tb_note_sndng)
 *
 * <p>[Phase 5.2 규범] 클래스 레벨 @SuperBuilder 제거, 빌더는 정적 팩토리 {@link #create}에 @Builder 배치.
 * 연관(note)은 빌더로 설정하므로 팩토리 파라미터에 포함. 감사 필드는 표준 Auditing에 위임.
 * (@AllArgsConstructor 는 {@code new NoteTrnsmit(...)} 호출부가 존재하여 유지, create() 가 위임)
 */
@Entity
@Table(name = "tb_note_sndng")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
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
