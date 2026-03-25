package com.company.project.foundation.domain.template;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface TmplatInfoRepository extends JpaRepository<TmplatInfo, String> {
    List<TmplatInfo> findByTmplatSeCode(String tmplatSeCode);
}
