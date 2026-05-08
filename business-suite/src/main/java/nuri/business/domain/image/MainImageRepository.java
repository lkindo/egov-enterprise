package nuri.business.domain.image;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

/**
 * 메인 이미지 Repository
 */
@org.springframework.stereotype.Repository("imageMainImageRepository")
public interface MainImageRepository extends JpaRepository<MainImage, String> {
    Page<MainImage> findByImageNmContaining(String imageNm, Pageable pageable);

    List<MainImage> findByReflctAt(String reflctAt);
}
