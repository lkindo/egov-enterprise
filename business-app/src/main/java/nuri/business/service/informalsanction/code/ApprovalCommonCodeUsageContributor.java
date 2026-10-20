package nuri.business.service.informalsanction.code;

import nuri.foundation.core.code.CommonCodeUsageContributor;
import org.springframework.stereotype.Component;

import java.util.Collection;
import java.util.List;

/**
 * 결재 기능이 읽는 공통코드 그룹 — 결재 업무 구분(COM075).
 *
 * <p>{@code InformalSanctionService#getTaskTypes} 가 이 그룹의 '사용' 상세 코드만 읽는다. 기안 화면의 업무 구분 선택지,
 * 상신 검증(목록에 없는 코드는 400), 결재 목록·상세·임시저장·결재선 추천의 업무 구분 이름이 모두 이 목록이다.
 */
@Component
public class ApprovalCommonCodeUsageContributor implements CommonCodeUsageContributor {

    @Override
    public Collection<Usage> commonCodeUsages() {
        return List.of(new Usage("COM075",
                "결재 기안의 업무 구분 선택지와 상신 검증이 이 그룹의 '사용' 상세 코드만 받습니다. "
                        + "결재 목록·상세·임시저장·결재선 추천의 업무 구분 이름도 여기서 읽습니다. "
                        + "상세 코드를 사용 안 함으로 바꾸면 그 업무 구분으로는 새로 상신할 수 없고, 이미 만든 문서에서는 업무 구분 이름이 비어 보입니다."));
    }
}
