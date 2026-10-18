package nuri.business.domain.code;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

public interface CommonCodeCategoryRepositoryCustom {
    void insert(CommonCodeCategory code);

    Page<CommonCodeCategory> searchCommonCodeCategories(String searchCondition, String searchKeyword,
            Pageable pageable);
}
