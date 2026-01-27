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
            // Administration
            "egovAdministrationWordIdGnrService",
            // Anniversary
            "egovAnnvrsryManageIdGnrService",
            // Banner
            "egovBannerIdGnrService",
            // Bndt (당직관리)
            "egovBndtManageIdGnrService",
            // Cmt (출퇴근)
            "egovCmtManageIdGnrService",
            // Cnslt (상담)
            "egovCnsltManageIdGnrService",
            // Cpyrht (저작권)
            "egovCpyrhtPrtcPolicyIdGnrService",
            // Ctsnn (경조)
            "egovCtsnnManageIdGnrService",
            // DB Monitoring
            "egovDbMntrngLogIdGnrService",
            // Dept (부서)
            "egovDeptManaIdGnrService",
            "egovDeptManageIdGnrService",
            // Event
            "egovEventCmpgnIdGnrService",
            "egovEventManageIdGnrService",
            // External HR
            "egovExtrlHrIdGnrService",
            // FAQ
            "egovFaqManageIdGnrService",
            // FileSys Monitoring
            "egovFileSysMntrngIdGnrService",
            "egovFileSysMntrngLogIdGnrService",
            // Homepage Content
            "egovHpcmIdGnrService",
            // HTTP Monitoring
            "egovHttpLogManageIdGnrService",
            "egovHttpManageIdGnrService",
            // Individual Info Policy
            "egovIndvdlInfoPolicyIdGnrService",
            // Individual Page
            "egovIndvdlPgeIdGnrService",
            // Informal Sanction
            "egovInfrmlSanctnIdGnrService",
            // Internet Service
            "egovIntnetSvcGuidanceIdGnrService",
            // Login Screen Image
            "egovLoginScrinImageIdGnrService",
            "egovLoginScrnImageIdGnrService",
            // Main Image
            "egovMainImageIdGnrService",
            // Meeting
            "egovMgtIdGnrService",
            // Mtg Place
            "egovMtgPlaceManageIdGnrService",
            "egovMtgPlaceResveIdGnrService",
            "egovMtgPlaceResveManageIdGnrService",
            // News
            "egovNewsIdGnrService",
            "egovNewsManageIdGnrService",
            // Note
            "egovNoteManageIdGnrService",
            "egovNoteRecptnIdGnrService",
            "egovNoteTrnsmitIdGnrService",
            // Notification
            "egovNotificationIdGnrService",
            // Network Service Monitoring
            "egovNtwrkSvcMntrngLogIdGnrService",
            // Online Manual
            "egovOnlineManualIdGnrService",
            "egovOnlineMenualIdGnrService",
            // Online Poll
            "egovOnlinePollItemIdGnrService",
            "egovOnlinePollManageIdGnrService",
            "egovOnlinePollResultIdGnrService",
            // Popup
            "egovPopupManageIdGnrService",
            // Process Monitoring
            "egovProcessMonIdGnrService",
            "egovProcessMonLogIdGnrService",
            // Proxy Service
            "egovProxyLogIdGnrService",
            "egovProxySvcIdGnrService",
            // QnA
            "egovQnaManageIdGnrService",
            // Questionnaire
            "egovQustnrItemManageIdGnrService",
            "egovQustnrManageIdGnrService",
            "egovQustnrQestnManageIdGnrService",
            "egovQustnrTmplatManageIdGnrService",
            // Recomend Site
            "egovRecomendSiteIdGnrService",
            "egovRecomendSiteManageIdGnrService",
            // Rough Map
            "egovRoughMapIdGnrService",
            // RSS
            "egovRssManageIdGnrService",
            "egovRssTagManageIdGnrService",
            // Reward
            "egovRwardManageIdGnrService",
            // Server Resource Monitoring
            "egovServerResrceMntrngLogIdGnrService",
            // Site
            "egovSiteIdGnrService",
            "egovSiteManageIdGnrService",
            // Stipulation
            "egovStplatManageIdGnrService",
            // Synchronize Server
            "egovSynchrnServerIdGnrService",
            // Transmit/Receive Monitoring
            "egovTrsmrcvMntrngLogIdGnrService",
            // Unity Link
            "egovUnityLinkIdGnrService",
            // User Confirm
            "egovUsrCnfrmIdGnrService",
            // Wiki Bookmark
            "egovWikiBookmarkIdGnrService",
            // Word Dictionary
            "egovWordDicaryIdGnrService",
            // Questionnaire Respond
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
                builder.addPropertyValue("blockSize", 10);
                builder.addPropertyValue("table", "IDS");
                builder.addPropertyValue("tableName", beanName.toUpperCase());

                registry.registerBeanDefinition(beanName, builder.getBeanDefinition());
            }
        }
    }
}
