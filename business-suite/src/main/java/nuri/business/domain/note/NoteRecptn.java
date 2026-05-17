package nuri.business.domain.note;
import jakarta.persistence.EntityListeners;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import nuri.foundation.domain.common.BaseEntity;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;
import org.hibernate.annotations.DynamicInsert;
import org.hibernate.annotations.DynamicUpdate;

@EntityListeners(AuditingEntityListener.class)
@Entity
@Table(name = "TB_NOTE_RCPTN")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@SuperBuilder
@DynamicInsert
@DynamicUpdate
public class NoteRecptn extends BaseEntity {

    @Id
    @Column(name = "NOTE_RCPTN_ID", length = 20)
    private String noteRecptnId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "NOTE_ID")
    private Note note;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "NOTE_SNDNG_ID")
    private NoteTrnsmit noteDsptch;

    @Column(name = "RCVR_ID", length = 20)
    private String rcverId;

    @Column(name = "OPEN_YN", length = 1)
    private String openYn;

    @Column(name = "RCPTN_SE_CD", length = 1)
    private String recptnSeCd;

    @PrePersist
    protected void onCreate() {
        if (this.openYn == null)
            this.openYn = "N";
    }
}
