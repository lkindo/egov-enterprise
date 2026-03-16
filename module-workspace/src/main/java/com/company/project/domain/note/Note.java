package com.company.project.domain.note;
import jakarta.persistence.EntityListeners;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import com.company.project.domain.common.BaseEntity;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;
import org.hibernate.annotations.DynamicInsert;
import org.hibernate.annotations.DynamicUpdate;

@EntityListeners(AuditingEntityListener.class)
@Entity(name = "NoteDomain")
@Table(name = "NNOTE")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@SuperBuilder
@DynamicInsert
@DynamicUpdate
public class Note extends BaseEntity {

    @Id
    @Column(name = "NOTE_ID", length = 20)
    private String noteId;

    @Column(name = "NOTE_SJ", length = 255)
    private String noteSj;

    @Column(name = "NOTE_CN", columnDefinition = "TEXT")
    private String noteCn;

    @Column(name = "ATCH_FILE_ID", length = 20)
    private String atchFileId;
}
