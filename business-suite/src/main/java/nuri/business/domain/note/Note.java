package nuri.business.domain.note;
import jakarta.persistence.EntityListeners;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import nuri.business.domain.common.BaseEntity;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.DynamicInsert;
import org.hibernate.annotations.DynamicUpdate;

/**
 * 쪽지 엔티티 (tb_note_info)
 *
 * <p>[Phase 5.2 규범] 클래스 레벨 @SuperBuilder/@AllArgsConstructor 제거, 빌더는 정적 팩토리 {@link #create}에 @Builder 배치.
 * 컬렉션 기본값(new ArrayList)은 필드 초기화로 유지, 감사 필드는 표준 Auditing 파이프라인에 위임.
 * (커스텀 4-인자 생성자는 {@code new Note(...)} 호출부가 있어 유지, create() 가 이를 위임)
 */
@EntityListeners(AuditingEntityListener.class)
@Entity(name = "NoteDomain")
@Table(name = "tb_note_info")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
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

    @Column(name = "atch_file_id", length = 20)
    private String atchFileId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "atch_file_id", referencedColumnName = "atch_file_id", insertable = false, updatable = false,
        foreignKey = @ForeignKey(ConstraintMode.NO_CONSTRAINT))
    private nuri.business.domain.file.FileMaster fileMaster;

    @OneToMany(mappedBy = "note", cascade = CascadeType.ALL, orphanRemoval = true)
    private java.util.List<NoteRecptn> noteRecptns = new java.util.ArrayList<>();

    @OneToMany(mappedBy = "note", cascade = CascadeType.ALL, orphanRemoval = true)
    private java.util.List<NoteTrnsmit> noteTrnsmits = new java.util.ArrayList<>();

    public Note(String noteId, String noteTtl, String noteCn, String atchFileId) {
        this.noteId = noteId;
        this.noteTtl = noteTtl;
        this.noteCn = noteCn;
        this.atchFileId = atchFileId;
    }

    @Builder
    public static Note create(String noteId, String noteTtl, String noteCn, String atchFileId) {
        return new Note(noteId, noteTtl, noteCn, atchFileId);
    }
}
