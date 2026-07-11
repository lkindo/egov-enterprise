package nuri.business.domain.faq;

import nuri.foundation.domain.common.BaseEntity;
import jakarta.persistence.*;
import lombok.*;
import lombok.Builder;

/**
 * FAQ 정보 Entity
 * 매핑 테이블: TB_FAQ_INFO
 */
@Entity
@Table(name = "tb_faq_info")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Faq extends BaseEntity {

    @Id
    @Column(length = 20)
    private String faqId;

    @Column(length = 100, nullable = false)
    private String qstnTtl;

    @Column(columnDefinition = "TEXT", length = 4000)
    private String qstnCn;

    @Column(columnDefinition = "TEXT", length = 4000)
    private String ansCn;

    private Integer inqCnt = 0;

    @Column(name = "atch_file_id", length = 20)
    private String atchFileId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "atch_file_id", referencedColumnName = "atch_file_id", insertable = false, updatable = false,
        foreignKey = @ForeignKey(ConstraintMode.NO_CONSTRAINT))
    private nuri.business.domain.file.FileMaster fileMaster;

    // 팩토리 위임용 private 생성자 (빌더로 설정되는 own 필드만 매핑, @Builder.Default 널병합 재현)
    private Faq(String faqId, String qstnTtl, String qstnCn, String ansCn, Integer inqCnt, String atchFileId) {
        this.faqId = faqId;
        this.qstnTtl = qstnTtl;
        this.qstnCn = qstnCn;
        this.ansCn = ansCn;
        this.inqCnt = inqCnt != null ? inqCnt : 0;
        this.atchFileId = atchFileId;
    }

    @Builder
    public static Faq create(String faqId, String qstnTtl, String qstnCn, String ansCn, Integer inqCnt, String atchFileId) {
        return new Faq(faqId, qstnTtl, qstnCn, ansCn, inqCnt, atchFileId);
    }

    public void update(String qstnTtl, String qstnCn, String ansCn, String atchFileId) {
        this.qstnTtl = qstnTtl;
        this.qstnCn = qstnCn;
        this.ansCn = ansCn;
        this.atchFileId = atchFileId;
    }

    public void increaseInqCnt() {
        this.inqCnt = (this.inqCnt == null ? 0 : this.inqCnt) + 1;
    }

    public void increaseViewCount() {
        this.increaseInqCnt();
    }

    // ----- [Legacy Getter/Setter & Builder Aliases] -----
    // 레거시 별칭 완전 철폐 (표준화 동기화)
}
