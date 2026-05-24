package nuri.foundation.domain.system.service.survey;

import jakarta.persistence.EntityListeners;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;
import nuri.foundation.domain.common.BaseEntity;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;

/**
 * 설문 응답 결과 엔티티 (물리 DB 명세 100% 일치)
 */
@EntityListeners(AuditingEntityListener.class)
@Entity
@Table(name = "tb_srvy_rslt")
@Getter
@Setter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@SuperBuilder
public class SurveyResult extends BaseEntity {

    @Id
    @Column(name = "srvy_rspns_id", length = 20)
    private String srvyRspnsId;

    @Column(length = 20, nullable = false)
    private String srvyId;

    @Column(length = 20, nullable = false)
    private String srvyTmpltId;

    @Column(length = 20, nullable = false)
    private String srvyQstnId;

    @Column(length = 20, nullable = false)
    private String srvyArtclId;

    @Column(length = 4000)
    private String rspdntAnsCn;

    @Column(length = 100)
    private String rspnsNm;

    @Column(length = 4000)
    private String etcAnsCn;

    public void update(String rspdntAnsCn, String rspnsNm, String etcAnsCn) {
        this.rspdntAnsCn = rspdntAnsCn;
        this.rspnsNm = rspnsNm;
        this.etcAnsCn = etcAnsCn;
    }
}
