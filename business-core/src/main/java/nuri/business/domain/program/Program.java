package nuri.business.domain.program;

import nuri.foundation.domain.common.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Entity
@Table(name = "tb_prgrm_lst")
public class Program extends BaseEntity {

    @Id
    @Column(name = "prgrm_file_nm", length = 100)
    private String prgrmFileNm;

    @Column(length = 1000)
    private String prgrmStrgPath;

    @Column(length = 100)
    private String prgrmKornNm;

    @Column(length = 1000)
    private String url;

    @Column(length = 4000)
    private String prgrmExpln;

    private Program(String prgrmFileNm, String prgrmStrgPath, String prgrmKornNm, String url, String prgrmExpln) {
        this.prgrmFileNm = prgrmFileNm;
        this.prgrmStrgPath = prgrmStrgPath;
        this.prgrmKornNm = prgrmKornNm;
        this.url = url;
        this.prgrmExpln = prgrmExpln;
    }

    @Builder
    public static Program create(String prgrmFileNm, String prgrmStrgPath, String prgrmKornNm, String url, String prgrmExpln) {
        return new Program(prgrmFileNm, prgrmStrgPath, prgrmKornNm, url, prgrmExpln);
    }

    public void update(String prgrmStrgPath, String prgrmKornNm, String url, String prgrmExpln) {
        this.prgrmStrgPath = prgrmStrgPath;
        this.prgrmKornNm = prgrmKornNm;
        this.url = url;
        this.prgrmExpln = prgrmExpln;
    }
}
