package egovframework.com.sym.log.plg.service;

import javax.sql.DataSource;

import org.egovframe.rte.fdl.idgnr.EgovIdGnrService;
import org.egovframe.rte.fdl.idgnr.impl.EgovTableIdGnrServiceImpl;
import org.egovframe.rte.fdl.idgnr.impl.strategy.EgovIdGnrStrategyImpl;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import jakarta.annotation.Resource;

/**
 * @Class Name : EgovPrivacyConfig.java
 * @Description : 媛쒖씤?뺣낫 議고쉶 ?대젰 愿由щ? ?꾪븳 JavaConfig
 * @Modification Information
 *
 *    ?섏젙??        ?섏젙??        ?섏젙?댁슜
 *    -------        -------     -------------------
 *    2014.09.11	?쒖??꾨젅?꾩썙??	理쒖큹?앹꽦
* @author Vincent Han
 * @since 2014.09.11
 * @version 3.5
 */
@Configuration
public class EgovPrivacyConfig {

	@Resource(name = "egov.dataSource")
	DataSource dataSource;

	@Bean(destroyMethod = "destroy")
	public EgovIdGnrService egovPrivacyLogIdGnrService() {

		EgovIdGnrStrategyImpl strategy = new EgovIdGnrStrategyImpl();
		strategy.setPrefix("PRVCY_");
		strategy.setCipers(14);
		strategy.setFillChar('0');

		EgovTableIdGnrServiceImpl idGnrService = new EgovTableIdGnrServiceImpl();
		idGnrService.setDataSource(dataSource);
		idGnrService.setStrategy(strategy);
		idGnrService.setBlockSize(10);
		idGnrService.setTable("COMTECOPSEQ");
		idGnrService.setTableName("PRIVACYLOG_ID");

		return idGnrService;
	}

}
