package nuri.business.domain.note;

import nuri.business.domain.common.BaseEntity;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.DynamicInsert;
import org.hibernate.annotations.DynamicUpdate;

/**
 * 쪽지 수신 엔티티 (tb_note_rcptn)
 *
 * <p>[Phase 5.2 규범] 클래스 레벨 @SuperBuilder 제거, 빌더는 정적 팩토리 {@link #create}에 @Builder 배치.
 * 연관(note, noteDsptch)은 빌더로 설정하므로 팩토리 파라미터에 포함. 감사 필드는 표준 Auditing에 위임.
 * (@AllArgsConstructor 는 {@code new NoteRecptn(...)} 호출부가 존재하여 유지, create() 가 위임)
 */
@Entity
@Table(name = "tb_note_rcptn")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@DynamicInsert
@DynamicUpdate
public class NoteRecptn extends BaseEntity {

    @Id
    @Column(length = 20)
    private String noteRcptnId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "NOTE_ID")
    private Note note;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "NOTE_SNDNG_ID")
    private NoteTrnsmit noteDsptch;

    @Column(length = 20)
    private String rcvrId;

    @Column(length = 1)
    private String openYn;

    @Column(length = 12)
    private String rcptnSeCd;

    @Builder
    public static NoteRecptn create(String noteRcptnId, Note note, NoteTrnsmit noteDsptch,
            String rcvrId, String openYn, String rcptnSeCd) {
        return new NoteRecptn(noteRcptnId, note, noteDsptch, rcvrId, openYn, rcptnSeCd);
    }

    @PrePersist
    protected void onCreate() {
        if (this.openYn == null)
            this.openYn = "N";
    }
}
