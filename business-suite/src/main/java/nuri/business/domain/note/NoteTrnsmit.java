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
@Table(name = "TB_NOTE_SNDNG")
@Getter
@Setter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@SuperBuilder
@DynamicInsert
@DynamicUpdate
public class NoteTrnsmit extends BaseEntity {

    @Id
    @Column(name = "NOTE_SNDNG_ID", length = 20)
    private String noteDsptchId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "NOTE_ID")
    private Note note;

    @Column(name = "SNDR_ID", length = 20)
    private String dsptchUserId;

    @Column(name = "DEL_YN", length = 1)
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
