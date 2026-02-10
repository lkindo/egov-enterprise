package com.company.project.domain.integration;

import java.util.List;

public interface SystemConnectionRepositoryCustom {
    List<SystemConnectionStatsDto> findSystemConnectionStats(String searchKeyword);
}
