package egovframework.com.cmm;

import org.egovframe.rte.fdl.cmmn.exception.handler.ExceptionHandler;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/**
 * @Class Name : EgovComExcepHndlr.java
 * @Description : 怨듯넻?쒕퉬?ㅼ쓽 exception 泥섎━ ?대옒??
 * @Modification Information
 *
 *    ?섏젙??      ?섏젙??        ?섏젙?댁슜
 *    -------        -------     -------------------
 *    2009. 3. 13.     ?댁궪??
 *
 * @author 怨듯넻 ?쒕퉬??媛쒕컻? ?댁궪??
 * @since 2009. 3. 13.
 * @version
 * @see
 *
 */
public class EgovComExcepHndlr implements ExceptionHandler {

	private static final Logger LOGGER = LoggerFactory.getLogger(EgovComExcepHndlr.class);

    /*
    @Resource(name = "otherSSLMailSender")
    private SimpleSSLMail mailSender;
     */
    /**
     * 諛쒖깮??Exception??泥섎━?쒕떎.
     */
    @Override
	public void occur(Exception ex, String packageName) {
    	//log.debug(" EgovServiceExceptionHandler run...............");

    	/*
		try {
			mailSender. send(ex, packageName);
			log.debug(" sending a alert mail  is completed ");
		} catch (Exception e) {
			LOGGER.error(packageName, ex);
		}
		*/

    	LOGGER.error(packageName, ex);
	}
}
