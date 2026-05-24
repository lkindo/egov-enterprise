package nuri.foundation.domain.system.service.survey;

import jakarta.persistence.EntityListeners;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;
import nuri.foundation.domain.common.BaseEntity;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;

/**
 * 설문 문항 엔티티 (물리 DB 명세 100% 일치)
 */
@EntityListeners(AuditingEntityListener.class)
@Entity
@Table(name = "tb_srvy_qstn")
@Getter
@Setter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@SuperBuilder
public class SurveyQuestion extends BaseEntity {

    @Id
    @Column(name = "srvy_qstn_id", length = 20)
    private String srvyQstnId;

    @Column(length = 20)
    private String srvyId;

    private Long qstnSn;

    @Column(length = 12)
    private String qstnTypeCd;

    @Column(length = 4000)
    private String qstnCn;

    private Integer maxChcCnt;

    @Column(length = 20)
    private String srvyTmpltId;

    public void update(Long qstnSn, String qstnTypeCd, String qstnCn, Integer maxChcCnt) {
        this.qstnSn = qstnSn;
        this.qstnTypeCd = qstnTypeCd;
        this.qstnCn = qstnCn;
        this.maxChcCnt = maxChcCnt;
    }
}
