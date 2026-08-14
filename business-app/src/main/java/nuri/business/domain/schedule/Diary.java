package nuri.business.domain.schedule;

import nuri.foundation.domain.common.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.io.Serializable;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * 일지 엔티티 (tb_diary_info)
 *
 * <p>[Phase 5.2 규범] 클래스 레벨 @SuperBuilder/@AllArgsConstructor 제거, 빌더는 정적 팩토리 {@link #create}에 @Builder 배치.
 */
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Entity
@Table(name = "tb_diary_info")
public class Diary extends BaseEntity implements Serializable {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long diarySn;

    private Long schdlSn;

    private Integer diaryPrgrsRt;

    @Column(length = 100)
    private String diaryNm;

    @Column(length = 4000)
    private String drctnMttr;

    @Column(length = 4000)
    private String excptnMttr;

    @Column(length = 20)
    private String atchFileId;

    private Diary(Long diarySn, Long schdlSn, Integer diaryPrgrsRt, String diaryNm,
            String drctnMttr, String excptnMttr, String atchFileId) {
        this.diarySn = diarySn;
        this.schdlSn = schdlSn;
        this.diaryPrgrsRt = diaryPrgrsRt;
        this.diaryNm = diaryNm;
        this.drctnMttr = drctnMttr;
        this.excptnMttr = excptnMttr;
        this.atchFileId = atchFileId;
    }

    @Builder
    public static Diary create(Long diarySn, Long schdlSn, Integer diaryPrgrsRt, String diaryNm,
            String drctnMttr, String excptnMttr, String atchFileId) {
        return new Diary(diarySn, schdlSn, diaryPrgrsRt, diaryNm, drctnMttr, excptnMttr, atchFileId);
    }

    public void update(Integer diaryPrgrsRt, String diaryNm, String drctnMttr,
            String excptnMttr, String atchFileId) {
        this.diaryPrgrsRt = diaryPrgrsRt;
        this.diaryNm = diaryNm;
        this.drctnMttr = drctnMttr;
        this.excptnMttr = excptnMttr;
        this.atchFileId = atchFileId;
    }
}
