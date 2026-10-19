package nuri.business.domain.isg;

import nuri.foundation.domain.common.BaseEntity;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.DynamicInsert;
import org.hibernate.annotations.DynamicUpdate;

@Entity
@Table(name = "tb_intrn_svc")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@DynamicInsert
@DynamicUpdate
public class InternetSvcGuidance extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long itntSrvcSn;

    @Column(length = 100)
    private String itntSvcNm;

    @Column(length = 4000)
    private String itntSvcExpln;

    /**
     * 반영 여부. [2026-10-19] 이 값에 따라 안내를 보이거나 숨기는 화면·처리가 제품에 없어 API·화면에서 걷었다.
     * 물리 컬럼(tb_intrn_svc.rflt_yn)은 남기므로 매핑만 읽기 전용으로 둔다 — 앱은 이 컬럼에 쓰지 않는다.
     */
    @Column(length = 1, insertable = false, updatable = false)
    private String rfltYn;

    private InternetSvcGuidance(Long itntSrvcSn, String itntSvcNm, String itntSvcExpln) {
        this.itntSrvcSn = itntSrvcSn;
        this.itntSvcNm = itntSvcNm;
        this.itntSvcExpln = itntSvcExpln;
    }

    @Builder
    public static InternetSvcGuidance create(Long itntSrvcSn, String itntSvcNm, String itntSvcExpln) {
        return new InternetSvcGuidance(itntSrvcSn, itntSvcNm, itntSvcExpln);
    }

    public void update(String itntSvcNm, String itntSvcExpln) {
        this.itntSvcNm = itntSvcNm;
        this.itntSvcExpln = itntSvcExpln;
    }

}
