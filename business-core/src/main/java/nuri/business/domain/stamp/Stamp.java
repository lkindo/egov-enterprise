package nuri.business.domain.stamp;

import nuri.foundation.domain.common.BaseEntity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * 도장정보 엔티티.
 *
 * <p>레거시 {@code SiteMap}은 테이블 약어 {@code stmp}를 사이트맵으로 잘못 해석한 이름이었다.
 */
@Entity
@Table(name = "tb_stmp_info")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Stamp extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "stmp_sn")
    private Long stmpSn;

    @Column(length = 20)
    private String crtrId;

    @Column(length = 100)
    private String mpngFileNm;

    @Column(length = 1000)
    private String mpngFilePath;

    private Stamp(String crtrId, String mpngFileNm, String mpngFilePath) {
        this.crtrId = crtrId;
        this.mpngFileNm = mpngFileNm;
        this.mpngFilePath = mpngFilePath;
    }

    @Builder
    public static Stamp create(String crtrId, String mpngFileNm, String mpngFilePath) {
        return new Stamp(crtrId, mpngFileNm, mpngFilePath);
    }
}
