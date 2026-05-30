package nuri.business.domain.note;
import jakarta.persistence.EntityListeners;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import nuri.business.domain.common.BaseEntity;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;
import org.hibernate.annotations.DynamicInsert;
import org.hibernate.annotations.DynamicUpdate;

@EntityListeners(AuditingEntityListener.class)
@Entity
@Table(name = "tb_note_rcptn")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@SuperBuilder
@DynamicInsert
@DynamicUpdate
public class NoteRecptn extends BaseEntity {

    @Id
    @Column(name = "note_rcptn_id", length = 20)
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

    // ----- [Legacy Getter Aliases for Backwards Compatibility] -----
    public String getNoteRecptnId() { return this.noteRcptnId; }
    public String getRcverId() { return this.rcvrId; }
    public String getRecptnSeCd() { return this.rcptnSeCd; }

    // ----- [Legacy Setter Aliases for Backwards Compatibility] -----
    public void setNoteRecptnId(String noteRecptnId) { this.noteRcptnId = noteRecptnId; }
    public void setRcverId(String rcverId) { this.rcvrId = rcverId; }
    public void setRecptnSeCd(String recptnSeCd) { this.rcptnSeCd = recptnSeCd; }

    // ----- [Custom Builder Extension for Backwards Compatibility] -----
    public static abstract class NoteRecptnBuilder<C extends NoteRecptn, B extends NoteRecptnBuilder<C, B>> extends BaseEntityBuilder<C, B> {
        public B noteRecptnId(String noteRecptnId) {
            this.noteRcptnId = noteRecptnId;
            return self();
        }
        public B rcverId(String rcverId) {
            this.rcvrId = rcverId;
            return self();
        }
        public B recptnSeCd(String recptnSeCd) {
            this.rcptnSeCd = recptnSeCd;
            return self();
        }
    }

    @PrePersist
    protected void onCreate() {
        if (this.openYn == null)
            this.openYn = "N";
    }
}
