package com.company.project.domain.integration;

import java.util.List;

public interface IntegrationMessageRepositoryCustom {
    List<IntegrationMessage> searchMessages(String searchKeyword);

    long countMessages(String searchKeyword);
}
