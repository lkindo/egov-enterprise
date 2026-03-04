package com.company.project.domain.integration;

import java.util.List;

public interface IntegrationMessageItemRepositoryCustom {
    List<IntegrationMessageItem> searchMessageItems(String cntcMessageId, String searchKeyword);

    long countMessageItems(String cntcMessageId, String searchKeyword);
}