package nuri.business.domain.survey;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.io.Serializable;

/** 설문 응답자의 물리 복합 PK: 템플릿 일련번호 + 설문 일련번호 + 응답자 식별자. */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class SurveyRespondentId implements Serializable {

    private Long srvyTmpltSn;
    private Long srvySn;
    private String srvyRspdntId;
}
