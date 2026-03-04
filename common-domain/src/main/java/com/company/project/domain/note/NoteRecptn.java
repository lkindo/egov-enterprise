package com.company.project.domain.note;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.DynamicInsert;
import org.hibernate.annotations.DynamicUpdate;
import java.time.LocalDateTime;

@Entity
@Table(name = "NNOTERECPTN")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
@DynamicInsert
@DynamicUpdate
public class NoteRecptn {

    @Id
    @Column(name = "NOTE_RECPTN_ID", length = 20)
    private String noteRecptnId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "NOTE_ID")
    private Note note;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "NOTE_TRNSMIT_ID")
    private NoteTrnsmit noteTrnsmit;

    @Column(name = "RCVER_ID", length = 20)
    private String rcverId;

    @Column(name = "OPEN_YN", length = 1)
    private String openYn;

    @Column(name = "RECPTN_SE", length = 1)
    private String recptnSe;

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
        if (this.openYn == null)
            this.openYn = "N";
    }

    @PreUpdate
    protected void onUpdate() {
        this.lastUpdtPnttm = LocalDateTime.now();
    }
}