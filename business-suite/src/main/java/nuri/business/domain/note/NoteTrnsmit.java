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
@Table(name = "tb_note_sndng")
@Getter
@Setter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@SuperBuilder
@DynamicInsert
@DynamicUpdate
public class NoteTrnsmit extends BaseEntity {

    @Id
    @Column(name = "note_sndng_id", length = 20)
    private String noteSndngId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "NOTE_ID")
    private Note note;

    @Column(length = 20)
    private String sndrId;

    @Column(length = 1)
    private String delYn;

    // ----- [Legacy Getter Aliases for Backwards Compatibility] -----
    public String getNoteDsptchId() { return this.noteSndngId; }
    public String getDsptchUserId() { return this.sndrId; }

    // ----- [Legacy Setter Aliases for Backwards Compatibility] -----
    public void setNoteDsptchId(String noteDsptchId) { this.noteSndngId = noteDsptchId; }
    public void setDsptchUserId(String dsptchUserId) { this.sndrId = dsptchUserId; }

    // ----- [Custom Builder Extension for Backwards Compatibility] -----
    public static abstract class NoteTrnsmitBuilder<C extends NoteTrnsmit, B extends NoteTrnsmitBuilder<C, B>> extends BaseEntityBuilder<C, B> {
        public B noteDsptchId(String noteDsptchId) {
            this.noteSndngId = noteDsptchId;
            return self();
        }
        public B dsptchUserId(String dsptchUserId) {
            this.sndrId = dsptchUserId;
            return self();
        }
    }

    @PrePersist
    protected void onCreate() {
        if (this.delYn == null)
            this.delYn = "N";
    }
    
    // legacy
    public String getDeleteAt() { return delYn; }
    public void setDeleteAt(String v) { this.delYn = v; }
}
