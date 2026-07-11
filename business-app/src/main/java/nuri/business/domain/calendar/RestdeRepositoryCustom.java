package nuri.business.domain.calendar;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

public interface RestdeRepositoryCustom {
    Page<Restde> searchRestde(String searchCondition, String searchKeyword, Pageable pageable);
}
