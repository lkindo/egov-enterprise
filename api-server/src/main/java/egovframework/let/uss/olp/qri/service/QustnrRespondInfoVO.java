package egovframework.let.uss.olp.qri.service;

import egovframework.com.cmm.ComDefaultVO;
import lombok.Getter;
import lombok.Setter;

/**
 * 설문응답결과 VO
 */
@Getter
@Setter
public class QustnrRespondInfoVO extends ComDefaultVO {
    private static final long serialVersionUID = 1L;

    /** 설문응답결과ID */
    private String qestnrQesrspnsId;

    /** 설문문항ID */
    private String qestnrQesitmId;

    /** 설문ID */
    private String qestnrId;

    /** 설문템플릿ID */
    private String qestnrTmplatId;

    /** 설문항목ID */
    private String qustnrIemId;

    /** 응답자답변내용 */
    private String respondAnswerCn;

    /** 응답자명 */
    private String respondNm;

    /** 기타답변내용 */
    private String etcAnswerCn;

    /** 최초등록시점 */
    private String frstRegisterPnttm;

    /** 최초등록자ID */
    private String frstRegisterId;

    /** 최종수정시점 */
    private String lastUpdtPnttm;

    /** 최종수정자ID */
    private String lastUpdusrId;

    // 검색 조건 등 추가 필드가 필요하면 여기에 작성
}
