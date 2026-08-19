package nuri.business.domain.note;

import nuri.foundation.domain.common.BaseEntity;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.DynamicInsert;
import org.hibernate.annotations.DynamicUpdate;

/**
 * 쪽지 수신 엔티티 (tb_note_rcptn)
 *
 * <p>[Phase 5.2 규범] 클래스 레벨 Lombok 생성자/빌더를 제거하고 빌더는 정적 팩토리 {@link #create}에 @Builder 배치.
 * 연관(note, noteDsptch)은 빌더로 설정하므로 팩토리 파라미터에 포함. 감사 필드는 표준 Auditing에 위임.
 * 기존 package 호출부 호환은 명시적 package-private 생성자가 유지한다.
 */
@Entity
@Table(name = "tb_note_rcptn")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@DynamicInsert
@DynamicUpdate
public class NoteRecptn extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long noteRcptnSn;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "note_sn")
    private Note note;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "note_sndng_sn")
    private NoteTrnsmit noteDsptch;

    @Column(length = 20)
    private String rcvrId;

    @Column(length = 1)
    private String openYn;

    @Column(length = 12)
    private String rcptnSeCd;

    /** 수신자 관점 삭제여부(파티별 논리삭제, V2_21). 'Y' 면 수신함에서 숨김. */
    @Column(length = 1)
    private String delYn;

    NoteRecptn(Long noteRcptnSn, Note note, NoteTrnsmit noteDsptch,
            String rcvrId, String openYn, String rcptnSeCd, String delYn) {
        this.noteRcptnSn = noteRcptnSn;
        this.note = note;
        this.noteDsptch = noteDsptch;
        this.rcvrId = rcvrId;
        this.openYn = openYn;
        this.rcptnSeCd = rcptnSeCd;
        this.delYn = delYn;
    }

    @Builder
    public static NoteRecptn create(Long noteRcptnSn, Note note, NoteTrnsmit noteDsptch,
            String rcvrId, String openYn, String rcptnSeCd) {
        return new NoteRecptn(noteRcptnSn, note, noteDsptch, rcvrId, openYn, rcptnSeCd, "N");
    }

    /** 수신자 논리삭제(수신함에서 숨김). 발신 사본과 독립. */
    public void markDeleted() {
        this.delYn = "Y";
    }

    @PrePersist
    protected void onCreate() {
        if (this.openYn == null)
            this.openYn = "N";
        if (this.delYn == null)
            this.delYn = "N";
    }
}
