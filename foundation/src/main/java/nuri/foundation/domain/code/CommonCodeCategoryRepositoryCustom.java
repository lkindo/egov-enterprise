package nuri.foundation.domain.code;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

public interface CommonCodeCategoryRepositoryCustom {
    Page<CommonCodeCategory> searchCommonCodeCategories(String searchCondition, String searchKeyword,
            Pageable pageable);
}
