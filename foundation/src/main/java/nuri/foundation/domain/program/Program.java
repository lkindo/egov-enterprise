package nuri.foundation.domain.program;

import nuri.foundation.domain.common.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.experimental.SuperBuilder;

@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Entity
@Table(name = "TB_PROGRM_LIST")
@SuperBuilder
public class Program extends BaseEntity {

    @Id
    @Column(name = "PROGRM_FILE_NM", length = 60)
    private String progrmFileNm;

    @Column(name = "PROGRM_STRE_PATH", length = 100)
    private String progrmStrePath;

    @Column(name = "PROGRM_KOREAN_NM", length = 60)
    private String progrmKoreanNm;

    @Column(name = "URL", length = 100)
    private String url;

    @Column(name = "PROGRM_DC", length = 200)
    private String progrmDc;

    public void update(String progrmStrePath, String progrmKoreanNm, String url, String progrmDc) {
        this.progrmStrePath = progrmStrePath;
        this.progrmKoreanNm = progrmKoreanNm;
        this.url = url;
        this.progrmDc = progrmDc;
    }
}
