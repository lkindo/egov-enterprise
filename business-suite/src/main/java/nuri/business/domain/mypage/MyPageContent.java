package nuri.business.domain.mypage;
 
import nuri.business.domain.common.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * 마이페이지 콘텐츠 엔티티 (NINDVDLPGECNTNTS)
 * [Audit] BaseEntity 상속
 */
@Entity
@Table(name = "tb_indv_pg_conts")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class MyPageContent extends BaseEntity {

    @Id
    @Column(length = 20)
    private String cntntsId;

    @Column(length = 100)
    private String cntntsNm;

    @Column(length = 255)
    private String cntcUrl;

    @Column(length = 1)
    private String cntntsUseYn;

    @Column(length = 255)
    private String cntntsLinkUrl;

    @Column(length = 255)
    private String cntntsDc;

    private MyPageContent(String cntntsId, String cntntsNm, String cntcUrl, String cntntsUseYn,
                          String cntntsLinkUrl, String cntntsDc) {
        this.cntntsId = cntntsId;
        this.cntntsNm = cntntsNm;
        this.cntcUrl = cntcUrl;
        this.cntntsUseYn = cntntsUseYn;
        this.cntntsLinkUrl = cntntsLinkUrl;
        this.cntntsDc = cntntsDc;
    }

    @Builder
    public static MyPageContent create(String cntntsId, String cntntsNm, String cntcUrl, String cntntsUseYn,
                                       String cntntsLinkUrl, String cntntsDc) {
        return new MyPageContent(cntntsId, cntntsNm, cntcUrl, cntntsUseYn, cntntsLinkUrl, cntntsDc);
    }

    public void update(String cntntsNm, String cntcUrl, String cntntsUseYn, String cntntsLinkUrl, String cntntsDc) {
        this.cntntsNm = cntntsNm;
        this.cntcUrl = cntcUrl;
        this.cntntsUseYn = cntntsUseYn;
        this.cntntsLinkUrl = cntntsLinkUrl;
        this.cntntsDc = cntntsDc;
    }

}
