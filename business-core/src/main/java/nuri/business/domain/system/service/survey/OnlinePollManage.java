package nuri.business.domain.system.service.survey;

import nuri.foundation.domain.common.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.OneToMany;
import jakarta.persistence.CascadeType;
import lombok.*;
import java.util.ArrayList;
import java.util.List;

/**
 * 온라인 폴 관리 엔티티
 * 매핑 테이블: NONLINEPOLLMANAGE
 *
 * <p>[Phase 5.2 규범] 클래스 레벨 @SuperBuilder/@AllArgsConstructor 제거, 빌더는 정적 팩토리 {@link #create}에 @Builder 배치.
 * pollDsuseYn/pollAtmcDsuseYn 기본값("N")과 pollArticles 컬렉션 기본값(new ArrayList)은 팩토리에서 재현.
 */
@Entity
@Table(name = "tb_onln_poll_manage")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class OnlinePollManage extends BaseEntity {

    @Id
    @Column(length = 20)
    private String pollId;

    @Column(length = 100, nullable = false)
    private String pollNm;

    @Column(length = 8)
    private String pollBgngYmd;

    @Column(length = 8)
    private String pollEndYmd;

    @Column(length = 12)
    private String pollKndCd;

    @Column(length = 1)
    private String pollDsuseYn = "N";

    @Column(length = 1)
    private String pollAtmcDsuseYn = "N";

    @OneToMany(mappedBy = "pollManage", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<OnlinePollArticle> pollArticles = new ArrayList<>();

    private OnlinePollManage(String pollId, String pollNm, String pollBgngYmd, String pollEndYmd, String pollKndCd,
            String pollDsuseYn, String pollAtmcDsuseYn, List<OnlinePollArticle> pollArticles) {
        this.pollId = pollId;
        this.pollNm = pollNm;
        this.pollBgngYmd = pollBgngYmd;
        this.pollEndYmd = pollEndYmd;
        this.pollKndCd = pollKndCd;
        this.pollDsuseYn = pollDsuseYn != null ? pollDsuseYn : "N"; // 기존 @Builder.Default 재현
        this.pollAtmcDsuseYn = pollAtmcDsuseYn != null ? pollAtmcDsuseYn : "N";
        this.pollArticles = pollArticles != null ? pollArticles : new ArrayList<>();
    }

    @Builder
    public static OnlinePollManage create(String pollId, String pollNm, String pollBgngYmd, String pollEndYmd,
            String pollKndCd, String pollDsuseYn, String pollAtmcDsuseYn, List<OnlinePollArticle> pollArticles) {
        return new OnlinePollManage(pollId, pollNm, pollBgngYmd, pollEndYmd, pollKndCd,
                pollDsuseYn, pollAtmcDsuseYn, pollArticles);
    }

    public void update(String pollNm, String pollBgngYmd, String pollEndYmd, String pollKndCd,
            String pollDsuseYn, String pollAtmcDsuseYn) {
        this.pollNm = pollNm;
        this.pollBgngYmd = pollBgngYmd;
        this.pollEndYmd = pollEndYmd;
        this.pollKndCd = pollKndCd;
        this.pollDsuseYn = pollDsuseYn;
        this.pollAtmcDsuseYn = pollAtmcDsuseYn;
    }
}
