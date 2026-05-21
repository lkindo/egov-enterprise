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
    private String noteDsptchId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "NOTE_ID")
    private Note note;

    @Column(name = "sndr_id", length = 20)
    private String dsptchUserId;

    @Column(name = "del_yn", length = 1)
    private String delYn;

    @PrePersist
    protected void onCreate() {
        if (this.delYn == null)
            this.delYn = "N";
    }
    
    // legacy
    public String getDeleteAt() { return delYn; }
    public void setDeleteAt(String v) { this.delYn = v; }
}
