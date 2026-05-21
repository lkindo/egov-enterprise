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
@Entity(name = "NoteDomain")
@Table(name = "tb_note_info")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@SuperBuilder
@DynamicInsert
@DynamicUpdate
public class Note extends BaseEntity {

    @Id
    @Column(name = "note_id", length = 20)
    private String noteId;

    @Column(name = "note_ttl", length = 100)
    private String noteSj;

    @Column(name = "note_cn", columnDefinition = "TEXT", length = 4000)
    private String noteCn;

    @Column(name = "atch_file_id", length = 20)
    private String atchFileId;
}
