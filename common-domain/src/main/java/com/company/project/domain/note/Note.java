package com.company.project.domain.note;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.DynamicInsert;
import org.hibernate.annotations.DynamicUpdate;
import java.time.LocalDateTime;

@Entity(name = "NoteDomain")
@Table(name = "NNOTE")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
@DynamicInsert
@DynamicUpdate
public class Note {

    @Id
    @Column(name = "NOTE_ID", length = 20)
    private String noteId;

    @Column(name = "NOTE_SJ", length = 255)
    private String noteSj;

    @Column(name = "NOTE_CN", columnDefinition = "TEXT")
    private String noteCn;

    @Column(name = "ATCH_FILE_ID", length = 20)
    private String atchFileId;

    @Column(name = "FRST_REGISTER_ID", length = 20, updatable = false)
    private String frstRegisterId;

    @Column(name = "FRST_REGIST_PNTTM", updatable = false)
    private LocalDateTime frstRegistPnttm;

    @Column(name = "LAST_UPDUSR_ID", length = 20)
    private String lastUpdusrId;

    @Column(name = "LAST_UPDT_PNTTM")
    private LocalDateTime lastUpdtPnttm;

    @PrePersist
    protected void onCreate() {
        this.frstRegistPnttm = LocalDateTime.now();
        this.lastUpdtPnttm = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        this.lastUpdtPnttm = LocalDateTime.now();
    }
}
