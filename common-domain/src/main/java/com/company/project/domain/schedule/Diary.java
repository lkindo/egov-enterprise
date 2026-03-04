package com.company.project.domain.schedule;

import org.springframework.data.jpa.domain.support.AuditingEntityListener;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EntityListeners;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.io.Serializable;
import java.time.LocalDateTime;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;

@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Entity
@Table(name = "NDIARYINFO")
@EntityListeners(AuditingEntityListener.class)
public class Diary implements Serializable {

    @Id
    @Column(name = "DIARY_ID", length = 20)
    private String diaryId;

    @Column(name = "SCHDUL_ID", length = 20)
    private String schdulId;

    @Column(name = "DIARY_PROGRSRT")
    private Integer diaryProcsPte;

    @Column(name = "DIARY_NM", length = 255)
    private String diaryNm;

    @Column(name = "DRCT_MATTER", columnDefinition = "TEXT")
    private String drctMatter;

    @Column(name = "PARTCLR_MATTER", columnDefinition = "TEXT")
    private String partclrMatter;

    @Column(name = "ATCH_FILE_ID", length = 20)
    private String atchFileId;

    @Column(name = "FRST_REGISTER_ID", length = 20)
    private String frstRegisterId;

    @CreatedDate
    @Column(name = "FRST_REGIST_PNTTM", updatable = false)
    private LocalDateTime createdDate;

    @Column(name = "LAST_UPDUSR_ID", length = 20)
    private String lastUpdusrId;

    @LastModifiedDate
    @Column(name = "LAST_UPDT_PNTTM")
    private LocalDateTime modifiedDate;

    @Builder
    public Diary(String diaryId, String schdulId, Integer diaryProcsPte, String diaryNm,
            String drctMatter, String partclrMatter, String atchFileId, String frstRegisterId) {
        this.diaryId = diaryId;
        this.schdulId = schdulId;
        this.diaryProcsPte = diaryProcsPte;
        this.diaryNm = diaryNm;
        this.drctMatter = drctMatter;
        this.partclrMatter = partclrMatter;
        this.atchFileId = atchFileId;
        this.frstRegisterId = frstRegisterId;
    }

    public void update(Integer diaryProcsPte, String diaryNm, String drctMatter,
            String partclrMatter, String atchFileId, String lastUpdusrId) {
        this.diaryProcsPte = diaryProcsPte;
        this.diaryNm = diaryNm;
        this.drctMatter = drctMatter;
        this.partclrMatter = partclrMatter;
        this.atchFileId = atchFileId;
        this.lastUpdusrId = lastUpdusrId;
    }
}