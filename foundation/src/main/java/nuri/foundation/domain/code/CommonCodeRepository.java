package nuri.foundation.domain.code;

import org.springframework.stereotype.Repository;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.lang.NonNull;
import java.util.List;
import java.util.Optional;
import org.springframework.transaction.annotation.Transactional;

@Repository("commonCodeRepository")
public interface CommonCodeRepository extends JpaRepository<CommonCode, CommonCodeId>, CommonCodeRepositoryCustom {
    @Override
    @NonNull
    Optional<CommonCode> findById(@NonNull CommonCodeId id);

    @Override
    @Transactional
    void deleteById(@NonNull CommonCodeId id);

    List<CommonCode> findByCodeGroupIdAndUseAt(String codeGroupId, String useAt);
}
