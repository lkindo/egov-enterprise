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

    @Column(length = 100)
    private String noteTtl;

    @Column(columnDefinition = "TEXT", length = 4000)
    private String noteCn;

    @Column(length = 20)
    private String atchFileId;

    // ----- [Legacy Getter Aliases for Backwards Compatibility] -----
    public String getNoteSj() { return this.noteTtl; }

    // ----- [Legacy Setter Aliases for Backwards Compatibility] -----
    public void setNoteSj(String noteSj) { this.noteTtl = noteSj; }

    // ----- [Custom Builder Extension for Backwards Compatibility] -----
    public static abstract class NoteBuilder<C extends Note, B extends NoteBuilder<C, B>> extends BaseEntityBuilder<C, B> {
        public B noteSj(String noteSj) {
            this.noteTtl = noteSj;
            return self();
        }
    }
}
