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
    private String progrmFileNm;

    @Column(name = "prgrm_strg_path", length = 1000)
    private String progrmStrePath;

    @Column(name = "prgrm_korn_nm", length = 100)
    private String progrmKoreanNm;

    @Column(name = "url", length = 1000)
    private String url;

    @Column(name = "prgrm_expln", length = 4000)
    private String progrmDc;

    public void update(String progrmStrePath, String progrmKoreanNm, String url, String progrmDc) {
        this.progrmStrePath = progrmStrePath;
        this.progrmKoreanNm = progrmKoreanNm;
        this.url = url;
        this.progrmDc = progrmDc;
    }
}
