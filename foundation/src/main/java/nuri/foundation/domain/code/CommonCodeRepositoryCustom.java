package nuri.foundation.domain.code;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.lang.NonNull;

public interface CommonCodeRepositoryCustom {
    Page<CommonCodeDetailProjection> searchCommonCodeDetails(String searchCondition, String searchKeyword,
            @NonNull Pageable pageable);
}
