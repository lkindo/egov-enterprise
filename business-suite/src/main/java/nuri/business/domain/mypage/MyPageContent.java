package nuri.business.domain.mypage;
 
import nuri.business.domain.common.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.experimental.SuperBuilder;

/**
 * 마이페이지 콘텐츠 엔티티 (NINDVDLPGECNTNTS)
 * [Audit] BaseEntity 상속
 */
@Entity
@Table(name = "tb_indv_pg_conts")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@SuperBuilder
public class MyPageContent extends BaseEntity {

    @Id
    @Column(name = "cntnts_id", length = 20)
    private String cntntsId;

    @Column(length = 100)
    private String cntntsNm;

    @Column(length = 255)
    private String cntcUrl;

    @Column(length = 1)
    @com.fasterxml.jackson.annotation.JsonProperty("cntntsUseAt")
    private String cntntsUseYn;

    @Column(length = 255)
    private String cntntsLinkUrl;

    @Column(length = 255)
    private String cntntsDc;

    public void update(String cntntsNm, String cntcUrl, String cntntsUseYn, String cntntsLinkUrl, String cntntsDc) {
        this.cntntsNm = cntntsNm;
        this.cntcUrl = cntcUrl;
        this.cntntsUseYn = cntntsUseYn;
        this.cntntsLinkUrl = cntntsLinkUrl;
        this.cntntsDc = cntntsDc;
    }

    // ----- [Legacy Getter/Setter & Builder Aliases] -----

    public String getCntntsUseAt() {
        return this.cntntsUseYn;
    }

    public void setCntntsUseAt(String cntntsUseAt) {
        this.cntntsUseYn = cntntsUseAt;
    }

    public static abstract class MyPageContentBuilder<C extends MyPageContent, B extends MyPageContentBuilder<C, B>> extends BaseEntityBuilder<C, B> {
        private String cntntsUseYn;

        public B cntntsUseAt(String cntntsUseAt) {
            this.cntntsUseYn = cntntsUseAt;
            return self();
        }

        public B cntntsUseYn(String cntntsUseYn) {
            this.cntntsUseYn = cntntsUseYn;
            return self();
        }
    }
}
