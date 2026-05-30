package nuri.business.domain.system.service.survey;
import jakarta.persistence.EntityListeners;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import nuri.business.domain.common.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.OneToMany;
import jakarta.persistence.CascadeType;
import lombok.*;
import lombok.experimental.SuperBuilder;
import lombok.Builder;
import java.util.ArrayList;
import java.util.List;

/**
 * 온라인 폴 관리 엔티티
 * 매핑 테이블: NONLINEPOLLMANAGE
 */
@EntityListeners(AuditingEntityListener.class)
@Entity
@Table(name = "tb_onln_poll_manage")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@SuperBuilder
public class OnlinePollManage extends BaseEntity {

    @Id
    @Column(name = "poll_id", length = 20)
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
    @Builder.Default
    private String pollDsuseYn = "N";

    @Column(length = 1)
    @Builder.Default
    private String pollAtmcDsuseYn = "N";

    @OneToMany(mappedBy = "pollManage", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<OnlinePollArticle> pollArticles = new ArrayList<>();

    public void update(String pollNm, String pollBgngYmd, String pollEndYmd, String pollKndCd,
            String pollDsuseYn, String pollAtmcDsuseYn) {
        this.pollNm = pollNm;
        this.pollBgngYmd = pollBgngYmd;
        this.pollEndYmd = pollEndYmd;
        this.pollKndCd = pollKndCd;
        this.pollDsuseYn = pollDsuseYn;
        this.pollAtmcDsuseYn = pollAtmcDsuseYn;
    }

    // legacy
    public String getPollTtl() { return pollNm; }
    public void setPollTtl(String v) { this.pollNm = v; }
}
