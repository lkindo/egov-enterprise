package nuri.api.support;

import nuri.foundation.core.exception.BusinessException;
import nuri.foundation.core.exception.CommonErrorCode;
import org.springframework.data.domain.PageRequest;

/** Validate one-based external pagination before arithmetic or allocation. */
public final class PageRequests {
    private PageRequests() { }

    public static PageRequest of(int pageIndex, int pageUnit) {
        if (pageIndex < 1 || pageUnit < 1 || pageUnit > 100) {
            throw new BusinessException(CommonErrorCode.INVALID_INPUT_VALUE);
        }
        return PageRequest.of(pageIndex - 1, pageUnit);
    }
}
