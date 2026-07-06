package nuri.business.domain.menu;
import nuri.business.domain.common.BaseEntity;
import jakarta.persistence.EntityListeners;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Builder;

import lombok.Getter;
import lombok.NoArgsConstructor;

@EntityListeners(AuditingEntityListener.class)
@Entity
@Table(name = "tb_stmp_info")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class SiteMap extends BaseEntity {

    @Id
    @Column(length = 20)
    private String mpngCrtId;

    @Column(length = 20)
    private String crtrId;

    @Column(length = 100)
    private String mpngFileNm;

    @Column(length = 1000)
    private String mpngFilePath;

    private SiteMap(String mpngCrtId, String crtrId, String mpngFileNm, String mpngFilePath) {
        this.mpngCrtId = mpngCrtId;
        this.crtrId = crtrId;
        this.mpngFileNm = mpngFileNm;
        this.mpngFilePath = mpngFilePath;
    }

    @Builder
    public static SiteMap create(String mpngCrtId, String crtrId, String mpngFileNm, String mpngFilePath) {
        return new SiteMap(mpngCrtId, crtrId, mpngFileNm, mpngFilePath);
    }
}
