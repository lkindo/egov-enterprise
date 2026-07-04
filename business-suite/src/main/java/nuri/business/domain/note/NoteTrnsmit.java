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
    @PrePersist
    protected void onCreate() {
        if (this.delYn == null)
            this.delYn = "N";
    }

    /** 소프트 삭제. 자식(tb_note_rcptn)이 FK 로 참조하므로 물리 DELETE 는 제약위반을 일으킨다. */
    public void softDelete() {
        this.delYn = "Y";
    }
}
