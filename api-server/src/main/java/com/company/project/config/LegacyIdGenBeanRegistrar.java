package com.company.project.config;

import org.egovframe.rte.fdl.idgnr.impl.EgovTableIdGnrServiceImpl;
import org.egovframe.rte.fdl.idgnr.impl.strategy.EgovIdGnrStrategyImpl;
import org.springframework.beans.factory.config.BeanDefinition;
import org.springframework.beans.factory.support.BeanDefinitionBuilder;
import org.springframework.beans.factory.support.BeanDefinitionRegistry;
import org.springframework.context.annotation.ImportBeanDefinitionRegistrar;
import org.springframework.core.type.AnnotationMetadata;

public class LegacyIdGenBeanRegistrar implements ImportBeanDefinitionRegistrar {

    private static final String[] BEAN_NAMES = {
            "egovAdministrationWordIdGnrService",
            "egovAnnvrsryManageIdGnrService",
            "egovBannerIdGnrService",
            "egovCmtManageIdGnrService",
            "egovCnsltManageIdGnrService",
            "egovCpyrhtPrtcPolicyIdGnrService",
            "egovCtsnnManageIdGnrService",
            "egovDeptManaIdGnrService",
            "egovEventCmpgnIdGnrService",
            "egovEventManageIdGnrService",
            "egovFaqManageIdGnrService",
            "egovHpcmIdGnrService",
            "egovIndvdlInfoPolicyIdGnrService",
            "egovIndvdlPgeIdGnrService",
            "egovInfrmlSanctnIdGnrService",
            "egovIntnetSvcGuidanceIdGnrService",
            "egovLoginScrinImageIdGnrService",
            "egovMainImageIdGnrService",
            "egovMgtIdGnrService",
            "egovMtgPlaceManageIdGnrService",
            "egovMtgPlaceResveIdGnrService",
            "egovNewsManageIdGnrService",
            "egovNoteManageIdGnrService",
            "egovNoteRecptnIdGnrService",
            "egovNoteTrnsmitIdGnrService",
            "egovOnlineMenualIdGnrService",
            "egovOnlinePollItemIdGnrService",
            "egovOnlinePollManageIdGnrService",
            "egovOnlinePollResultIdGnrService",
            "egovPopupManageIdGnrService",
            "egovQnaManageIdGnrService",
            "egovQustnrItemManageIdGnrService",
            "egovQustnrManageIdGnrService",
            "egovQustnrQestnManageIdGnrService",
            "egovQustnrTmplatManageIdGnrService",
            "egovRecomendSiteManageIdGnrService",
            "egovRoughMapIdGnrService",
            "egovRssTagManageIdGnrService",
            "egovRwardManageIdGnrService",
            "egovSiteManageIdGnrService",
            "egovStplatManageIdGnrService",
            "egovUnityLinkIdGnrService",
            "egovUsrCnfrmIdGnrService",
            "egovWikiBookmarkIdGnrService",
            "egovWordDicaryIdGnrService",
            "qustnrRespondInfoIdGnrService",
            "qustnrRespondManageIdGnrService"
    };

    @Override
    public void registerBeanDefinitions(AnnotationMetadata importingClassMetadata, BeanDefinitionRegistry registry) {
        // Shared Strategy Bean Definition (if not exists)
        String strategyBeanName = "legacyMixPrefixStrategy";
        if (!registry.containsBeanDefinition(strategyBeanName)) {
            BeanDefinitionBuilder strategyBuilder = BeanDefinitionBuilder
                    .genericBeanDefinition(EgovIdGnrStrategyImpl.class);
            strategyBuilder.addPropertyValue("prefix", "TEST-");
            strategyBuilder.addPropertyValue("cipers", 15);
            strategyBuilder.addPropertyValue("fillChar", '0');
            registry.registerBeanDefinition(strategyBeanName, strategyBuilder.getBeanDefinition());
        }

        for (String beanName : BEAN_NAMES) {
            if (!registry.containsBeanDefinition(beanName)) {
                BeanDefinitionBuilder builder = BeanDefinitionBuilder
                        .genericBeanDefinition(EgovTableIdGnrServiceImpl.class);
                builder.addPropertyReference("dataSource", "dataSource");
                builder.addPropertyReference("strategy", strategyBeanName);
                builder.addPropertyValue("blockSize", 1);
                builder.addPropertyValue("table", "IDS");
                builder.addPropertyValue("tableName", beanName.toUpperCase()); // Use bean name as key for now

                // Set init-method is not strictly required if we don't need checks, but usually
                // setDataSource is enough.
                // EgovTableIdGnrServiceImpl has setDataSource, setStrategy, setBlockSize,
                // setTable, setTableName.

                registry.registerBeanDefinition(beanName, builder.getBeanDefinition());
            }
        }
    }
}
