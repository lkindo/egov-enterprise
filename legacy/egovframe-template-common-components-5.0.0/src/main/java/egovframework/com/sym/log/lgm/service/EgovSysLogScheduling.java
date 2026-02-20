package egovframework.com.sym.log.lgm.service;

import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.springframework.stereotype.Service;

import jakarta.annotation.Resource;

/**
 * @Class Name : EgovSysLogScheduling.java
 * @Description : ?쒖뒪??濡쒓렇 ?붿빟???꾪븳 ?ㅼ?伊대쭅 ?대옒??
 * @Modification Information
 *
 *    ?섏젙??      ?섏젙??        ?섏젙?댁슜
 *    -------        -------     -------------------
 *    2009. 3. 11.     ?댁궪??  理쒖큹?앹꽦
 *
 * @author 怨듯넻 ?쒕퉬??媛쒕컻? ?댁궪??
 * @since 2009. 3. 11.
 * @version
 * @see
 *
 */
@Service("egovSysLogScheduling")
public class EgovSysLogScheduling extends EgovAbstractServiceImpl {

	@Resource(name="EgovSysLogService")
	private EgovSysLogService sysLogService;

	/**
	 * ?쒖뒪??濡쒓렇?뺣낫瑜??붿빟?쒕떎.
	 * ?꾨궇??濡쒓렇瑜??붿빟?섏뿬 ?낅젰?섍퀬, 6媛쒖썡?꾩쓽 濡쒓렇瑜???젣?쒕떎.
	 *
	 * @param
	 * @return
	 * @throws Exception
	 */
	public void sysLogSummary() throws Exception {
		sysLogService.logInsertSysLogSummary();
	}

}
