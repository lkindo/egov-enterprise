package nuri.business.domain.cms;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import jakarta.persistence.Version;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import nuri.foundation.domain.common.BaseEntity;

/**
 * 콘텐츠 기능의 사이트 설정 한 항목(ADR-0039 결정 2). {@code HOME_INTRO} 는 업무 홈 맨 위에 보일 게시 페이지를 가리킨다 — 비어 있으면
 * 지정이 없다. 행은 마이그레이션이 하나 만들어 두고, 서비스는 업무 코드로 찾는다(생성 키와 업무 코드를 나눈다).
 */
@Entity
@Table(name = "tb_cms_site_stng", uniqueConstraints = {
        @UniqueConstraint(name = "uk_tb_cms_site_stng_stng_cd", columnNames = "stng_cd")
})
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class CmsSiteSetting extends BaseEntity {

    public static final String HOME_INTRO = "HOME_INTRO";

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long siteStngSn;

    @Column(length = 12, nullable = false)
    private String stngCd;

    /** 가리키는 콘텐츠. 게시 중지·보관 때 같은 트랜잭션에서 비운다. */
    private Long contsSn;

    /** 낙관적 잠금(DEC-OPS-378). 페이지 버전과 따로 센다. */
    @Version
    private Integer version;

    /** 마이그레이션이 만든 행이 없는 구성(새 시험 DB 등)에서 처음 지정할 때만 쓴다. */
    public static CmsSiteSetting create(String stngCd) {
        CmsSiteSetting setting = new CmsSiteSetting();
        setting.stngCd = java.util.Objects.requireNonNull(stngCd);
        return setting;
    }

    public void point(Long contsSn) {
        this.contsSn = contsSn;
    }
}
