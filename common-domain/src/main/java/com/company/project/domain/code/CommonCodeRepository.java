package com.company.project.domain.code;

import org.springframework.stereotype.Repository;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

@Repository("commonCodeRepository")
public interface CommonCodeRepository extends JpaRepository<CommonCode, CommonCodeId>, CommonCodeRepositoryCustom {
    List<CommonCode> findByCodeGroupIdAndUseAt(String codeGroupId, String useAt);
}
