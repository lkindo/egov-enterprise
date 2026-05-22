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
@Table(name = "tb_prgrm_lst")
@SuperBuilder
public class Program extends BaseEntity {

    @Id
    @Column(name = "prgrm_file_nm", length = 100)
    private String prgrmFileNm;

    @Column(name = "prgrm_strg_path", length = 1000)
    private String prgrmStrgPath;

    @Column(name = "prgrm_korn_nm", length = 100)
    private String prgrmKornNm;

    @Column(name = "url", length = 1000)
    private String url;

    @Column(name = "prgrm_expln", length = 4000)
    private String prgrmExpln;

    public void update(String prgrmStrgPath, String prgrmKornNm, String url, String prgrmExpln) {
        this.prgrmStrgPath = prgrmStrgPath;
        this.prgrmKornNm = prgrmKornNm;
        this.url = url;
        this.prgrmExpln = prgrmExpln;
    }
}

