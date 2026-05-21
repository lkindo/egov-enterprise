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
@Table(name = "tb_diary_info")
public class Diary extends BaseEntity implements Serializable {

    @Id
    @Column(name = "diary_id", length = 20)
    private String diaryId;

    @Column(name = "schdul_id", length = 20)
    private String schdlId;

    @Column(name = "diary_progrs_rt")
    private Integer diaryProcsPte;

    @Column(name = "diary_nm", length = 255)
    private String diaryNm;

    @Column(name = "drct_matter", columnDefinition = "TEXT")
    private String drctMatter;

    @Column(name = "partclr_matter", columnDefinition = "TEXT")
    private String partclrMatter;

    @Column(name = "atch_file_id", length = 20)
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
