package egovframework.com.utl.pao.service.impl;

import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.springframework.stereotype.Service;

import egovframework.com.utl.pao.service.EgovPrntngOutpt;
import egovframework.com.utl.pao.service.PrntngOutptVO;
import jakarta.annotation.Resource;

/**
 *
 * 愿?몄씠誘몄???????쒕퉬??援ы쁽?대옒?ㅻ? ?뺤쓽?쒕떎
 * @author 怨듯넻?쒕퉬??媛쒕컻? ?댁쨷??
 * @since 2009.04.01
 * @version 1.0
 * @see
 *
 * <pre>
 * << 媛쒖젙?대젰(Modification Information) >>
 *
 *   ?섏젙??     ?섏젙??          ?섏젙?댁슜
 *  -------    --------    ---------------------------
 *   2009.04.01  ?댁쨷??         理쒖큹 ?앹꽦
 *
 * </pre>
 */
@Service("PrntngOutpt")
public class EgovPrntngOutptImpl extends EgovAbstractServiceImpl implements EgovPrntngOutpt {

	@Resource(name="PrntngOutptDAO")
	private PrntngOutptDAO prntngOutptDAO;

	/**
	 * 愿?몄씠誘몄?瑜?議고쉶?쒕떎.
	 */
	@Override
	public PrntngOutptVO selectErncsl(PrntngOutptVO searchVO) throws Exception {
		return prntngOutptDAO.selectErncsl(searchVO);
	}

}
