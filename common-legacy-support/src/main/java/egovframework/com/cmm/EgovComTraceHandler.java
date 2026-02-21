package egovframework.com.cmm;

import org.egovframe.rte.fdl.cmmn.trace.handler.TraceHandler;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/**
 * @Class Name : EgovComTraceHandler.java
 * @Description : ?????? trace ???????
 * @Modification Information
 *
 *    ????      ????        ????
 *    -------        -------     -------------------
 *    2011. 09. 30.     JJY
 *
 * @author JJY
 * @since 2011. 9. 30.
 *
 **/
public class EgovComTraceHandler implements TraceHandler {

	private static final Logger LOGGER = LoggerFactory.getLogger(EgovComTraceHandler.class);

	/**
	 * ??????????.
	 **/
	@Override
	public void todo(Class<?> clazz, String message) {
		LOGGER.debug("[TRACE]CLASS::: {}", clazz.getName());
		LOGGER.debug("[TRACE]MESSAGE::: {}", message);
		//???? ????????????????.
	}
}
