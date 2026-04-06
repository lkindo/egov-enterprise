package nuri.business.domain.schedule;
import jakarta.persistence.EntityListeners;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import nuri.foundation.domain.common.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.io.Serializable;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.experimental.SuperBuilder;

@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@SuperBuilder
@EntityListeners(AuditingEntityListener.class)
@Entity
@Table(name = "NDIARYINFO")
public class Diary extends BaseEntity implements Serializable {

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

    public void update(Integer diaryProcsPte, String diaryNm, String drctMatter,
            String partclrMatter, String atchFileId) {
        this.diaryProcsPte = diaryProcsPte;
        this.diaryNm = diaryNm;
        this.drctMatter = drctMatter;
        this.partclrMatter = partclrMatter;
        this.atchFileId = atchFileId;
    }
}
