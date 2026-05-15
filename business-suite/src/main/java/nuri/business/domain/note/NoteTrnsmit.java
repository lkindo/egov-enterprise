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
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@SuperBuilder
@DynamicInsert
@DynamicUpdate
public class NoteTrnsmit extends BaseEntity {

    @Id
    @Column(name = "NOTE_TRNSMIT_ID", length = 20)
    private String noteTrnsmitId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "NOTE_ID")
    private Note note;

    @Column(name = "TRNSMITER_ID", length = 20)
    private String trnsmiterId;

    @Column(name = "DELETE_AT", length = 1)
    private String deleteAt;

    @PrePersist
    protected void onCreate() {
        if (this.deleteAt == null)
            this.deleteAt = "N";
    }
}
