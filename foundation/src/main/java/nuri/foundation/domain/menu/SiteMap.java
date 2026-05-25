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
@Table(name = "tb_stmp_info")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@SuperBuilder
public class SiteMap extends BaseEntity {

    @Id
    @Column(name = "mpng_crt_id", length = 20)
    private String mpngCrtId;

    @Column(length = 20)
    private String crtrId;

    @Column(length = 100)
    private String mpngFileNm;

    @Column(length = 1000)
    private String mpngFilePath;

    public SiteMap(String mpngCrtId, String crtrId, String mpngFileNm, String mpngFilePath) {
        this.mpngCrtId = mpngCrtId;
        this.crtrId = crtrId;
        this.mpngFileNm = mpngFileNm;
        this.mpngFilePath = mpngFilePath;
    }
}

