package nuri.foundation.domain.system.content.popup;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;

@org.springframework.stereotype.Repository("popupPopupDomainRepository")
public interface PopupDomainRepository extends JpaRepository<Popup, String> {

    Page<Popup> findByPopupTitleNameContaining(String popupTitleName, Pageable pageable);

    @Query("SELECT p FROM PopupDomain p WHERE p.isNotice = 'Y' AND :now BETWEEN p.noticeBeginDate AND p.noticeEndDate")
    List<Popup> findActivePopups(@Param("now") String now);
}
