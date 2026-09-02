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

    /**
     * 수신자가 쪽지를 열었다.
     *
     * <p>[2026-09-02] 종전에는 {@code openYn} 을 <b>'N' 으로 쓰기만 하고 'Y' 로 바꾸는 코드가
     * 저장소 어디에도 없었다</b>. 수신함의 '읽음/안읽음' 아이콘은 그 값을 그리므로 모든 쪽지가
     * 영원히 '안 읽음' 으로 맥동했고, 프런트 {@code NoteService.getNote} 의 주석은
     * '상세 조회 및 읽음 처리' 라고 없는 동작을 약속하고 있었다.
     *
     * <p>멱등이다 — 이미 연 쪽지를 다시 열어도 상태는 그대로다.
     */
    public void markOpened() {
        this.openYn = "Y";
    }

    @PrePersist
    protected void onCreate() {
        if (this.openYn == null)
            this.openYn = "N";
        if (this.delYn == null)
            this.delYn = "N";
    }
}
