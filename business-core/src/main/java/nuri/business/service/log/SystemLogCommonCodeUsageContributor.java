package nuri.business.service.log;

import nuri.foundation.core.code.CommonCodeUsageContributor;
import org.springframework.stereotype.Component;

import java.util.Collection;
import java.util.List;

/**
 * 공통 기반(core)이 읽는 공통코드 그룹 — 시스템 로그 처리 구분(COM033).
 *
 * <p>{@code SysLogRepositoryImpl#searchSysLogs} 는 처리 구분 코드를 이 그룹의 상세 코드와 잇지만(left join) 그 이름을
 * 조회 결과에 싣지 않는다. 그래서 목록·상세·내보내기는 처리 구분 코드 값(C·R·U·D·X, {@link ProcessTypeCode})을 그대로
 * 보이고, 이 그룹을 고쳐도 화면이 바뀌지 않는다. 사용처 문장은 그 사실을 그대로 말한다(2026-10-20 코드 판독).
 */
@Component
public class SystemLogCommonCodeUsageContributor implements CommonCodeUsageContributor {

    @Override
    public Collection<Usage> commonCodeUsages() {
        return List.of(new Usage("COM033",
                "시스템 로그 목록 조회가 처리 구분 코드(C·R·U·D·X)를 이 그룹의 상세 코드와 잇습니다. "
                        + "목록·상세·내보내기는 이름이 아니라 코드 값을 그대로 보이므로, 이 그룹의 이름이나 사용 여부를 고쳐도 화면은 바뀌지 않습니다."));
    }
}
