package egovframework.com.sym.log.ulg.service;

import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.springframework.stereotype.Service;

import jakarta.annotation.Resource;

/**
 * @Class Name : EgovUserLogScheduling.java
 * @Description : ?ъ슜濡쒓렇 ?붿빟???꾪븳 ?ㅼ?伊대쭅 ?대옒??
 * @Modification Information
 *
 *    ?섏젙??        ?섏젙??       ?섏젙?댁슜
 *    -------        -------     -------------------
 *    2009. 3. 11.   ?댁궪??       理쒖큹?앹꽦
 *    2011. 7. 01.   ?닿린??       ?⑦궎吏 遺꾨━(sym.log -> sym.log.ulg)
 *
 * @author 怨듯넻 ?쒕퉬??媛쒕컻? ?댁궪??
 * @since 2009. 3. 11.
 * @version
 * @see
 *
 */
@Service("egovUserLogScheduling")
public class EgovUserLogScheduling extends EgovAbstractServiceImpl {

	@Resource(name="EgovUserLogService")
	private EgovUserLogService userLogService;

	/**
	 * ?ъ슜??濡쒓렇?뺣낫瑜??앹꽦?쒕떎.
	 *
	 * @param
	 * @return
	 * @throws Exception
	 */
	public void userLogInsert() throws Exception {
		userLogService.logInsertUserLog();
	}

}
