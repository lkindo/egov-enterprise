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
@Table(name = "TB_PRGRM_LST")
@SuperBuilder
public class Program extends BaseEntity {

    @Id
    @Column(name = "PRGRM_FILE_NM", length = 60)
    private String progrmFileNm;

    @Column(name = "PRGRM_STRG_PATH", length = 100)
    private String progrmStrePath;

    @Column(name = "PRGRM_KORN_NM", length = 60)
    private String progrmKoreanNm;

    @Column(name = "URL", length = 100)
    private String url;

    @Column(name = "PRGRM_EXPLN", length = 200)
    private String progrmDc;

    public void update(String progrmStrePath, String progrmKoreanNm, String url, String progrmDc) {
        this.progrmStrePath = progrmStrePath;
        this.progrmKoreanNm = progrmKoreanNm;
        this.url = url;
        this.progrmDc = progrmDc;
    }
}
