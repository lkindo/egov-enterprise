package nuri.business.domain.faq;

import nuri.business.domain.common.BaseEntity;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;
import lombok.Builder;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

/**
 * FAQ 정보 Entity
 * 매핑 테이블: TB_FAQ_INFO
 */
@Entity
@Table(name = "tb_faq_info")
@Getter
@Setter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@SuperBuilder
@EntityListeners(AuditingEntityListener.class)
public class Faq extends BaseEntity {

    @Id
    @Column(name = "faq_id", length = 20)
    private String faqId;

    @Column(length = 100, nullable = false)
    private String qstnTtl;

    @Column(columnDefinition = "TEXT", length = 4000)
    private String qstnCn;

    @Column(columnDefinition = "TEXT", length = 4000)
    private String ansCn;

    @Builder.Default
    private Integer inqCnt = 0;

    @Column(name = "atch_file_id", length = 20)
    private String atchFileId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "atch_file_id", referencedColumnName = "atch_file_id", insertable = false, updatable = false,
        foreignKey = @ForeignKey(ConstraintMode.NO_CONSTRAINT))
    private nuri.business.domain.file.FileMaster fileMaster;

    public void update(String qstnTtl, String qstnCn, String ansCn, String atchFileId) {
        this.qstnTtl = qstnTtl;
        this.qstnCn = qstnCn;
        this.ansCn = ansCn;
        this.atchFileId = atchFileId;
    }

    public void increaseInqireCo() {
        this.inqCnt = (this.inqCnt == null ? 0 : this.inqCnt) + 1;
    }

    public void increaseViewCount() {
        this.increaseInqireCo();
    }

    // ----- [Legacy Getter/Setter & Builder Aliases] -----
    // 레거시 별칭 완전 철폐 (표준화 동기화)
}
