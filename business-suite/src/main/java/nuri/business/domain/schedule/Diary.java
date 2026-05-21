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

    @Column(name = "schdl_id", length = 20)
    private String schdlId;

    @Column(name = "diary_prgrs_rt")
    private Integer diaryPrgrsRt;

    @Column(name = "diary_nm", length = 100)
    private String diaryNm;

    @Column(name = "drctn_mttr", columnDefinition = "TEXT")
    private String drctnMttr;

    @Column(name = "excptn_mttr", columnDefinition = "TEXT")
    private String excptnMttr;

    @Column(name = "atch_file_id", length = 20)
    private String atchFileId;

    public void update(Integer diaryPrgrsRt, String diaryNm, String drctnMttr,
            String excptnMttr, String atchFileId) {
        this.diaryPrgrsRt = diaryPrgrsRt;
        this.diaryNm = diaryNm;
        this.drctnMttr = drctnMttr;
        this.excptnMttr = excptnMttr;
        this.atchFileId = atchFileId;
    }
}
