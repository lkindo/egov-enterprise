package nuri.foundation.domain.menu;
import nuri.foundation.domain.common.BaseEntity;
import jakarta.persistence.EntityListeners;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;
import lombok.experimental.SuperBuilder;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AccessLevel;

import lombok.Getter;
import lombok.NoArgsConstructor;

@EntityListeners(AuditingEntityListener.class)
@Entity
@Table(name = "TB_SITEMAP_INFO")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@SuperBuilder
public class SiteMap extends BaseEntity {

    @Id
    @Column(name = "MAPNG_CREAT_ID", length = 30)
    private String mapCreatId;

    @Column(name = "CREAT_PERSON_ID", length = 30)
    private String creatPersonId;

    @Column(name = "MAPNG_FILE_NM", length = 60)
    private String bndeFileNm;

    @Column(name = "MAPNG_FILE_PATH", length = 100)
    private String bndeFilePath;

    public SiteMap(String mapCreatId, String creatPersonId, String bndeFileNm, String bndeFilePath) {
        this.mapCreatId = mapCreatId;
        this.creatPersonId = creatPersonId;
        this.bndeFileNm = bndeFileNm;
        this.bndeFilePath = bndeFilePath;
    }
}
