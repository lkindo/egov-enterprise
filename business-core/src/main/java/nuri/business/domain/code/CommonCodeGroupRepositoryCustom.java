package nuri.business.domain.code;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

public interface CommonCodeGroupRepositoryCustom {
    void insert(CommonCodeGroup code);

    Page<CommonCodeGroupProjection> searchCommonCodeGroups(String searchCondition, String searchKeyword,
            Pageable pageable);
}
