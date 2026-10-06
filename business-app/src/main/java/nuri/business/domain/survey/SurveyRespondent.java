package nuri.business.domain.survey;

import nuri.foundation.domain.common.BaseEntity;
import jakarta.persistence.*;
import lombok.*;

/**
 * 설문 응답자 엔티티
 * 매핑 테이블: NQESTNRRESPOND
 *
 * <p>응답자 API·화면은 DEC-OPS-070 으로 걷혔고 행을 만드는 코드 경로가 없다. 엔티티는 저장소의
 * 존재 확인·FK 선정리(SurveyRespondentRepository)와 스키마 매핑을 위해서만 남긴다 — 생성 팩토리·변경자를 두지 않는다.
 */
@Entity
@Table(name = "tb_srvy_rspdnt")
@IdClass(SurveyRespondentId.class)
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class SurveyRespondent extends BaseEntity {

    @Id
    @Column(nullable = false)
    private Long srvyTmpltSn;

    @Id
    @Column(nullable = false)
    private Long srvySn;

    @Id
    @Column(length = 20, nullable = false)
    private String srvyRspdntId;

    @Column(length = 12)
    private String gndrCd;

    @Column(length = 12)
    private String crTypeCd;

    @Column(length = 100)
    private String rspdntNm;

    @Column(length = 8)
    private String brdt;

    @Column(length = 4)
    private String rgnTelno;

    @Column(length = 4)
    private String midTelno;

    @Column(length = 4)
    private String endTelno;
}
