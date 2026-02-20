package egovframework.com.cmm.service.impl;

import java.util.List;

import org.springframework.stereotype.Repository;

import egovframework.com.cmm.ComDefaultCodeVO;
import egovframework.com.cmm.service.CmmnDetailCode;

/**
 * 怨듯넻肄붾뱶???꾩껜 ?낅Т?먯꽌 怨듭슜?댁꽌 ?ъ슜?댁빞 ?섎뒗 ?쒕퉬?ㅻ? ?뺤쓽?섍린?꾪븳 ?곗씠???묎렐 ?대옒??
 * 
 * @author 怨듯넻 ?쒕퉬??媛쒕컻? ?댁궪??
 * @since 2009.03.11
 * @version 1.0
 * @see
 *
 *      <pre>
 *  == 媛쒖젙?대젰(Modification Information) ==
 *
 *   ?섏젙??     ?섏젙??          ?섏젙?댁슜
 *  -------    --------    ---------------------------
 *   2009.03.11  ?댁궪??         理쒖큹 ?앹꽦
 *   2025.07.16  ?대갚??         2025??而⑦듃由щ럭??`throws Exception` ?쒓굅
 *
 *      </pre>
 */
@Repository("cmmUseDAO")
public class CmmUseDAO extends EgovComAbstractDAO {

	/**
	 * 二쇱뼱吏?議곌굔???곕Ⅸ 怨듯넻肄붾뱶瑜?遺덈윭?⑤떎.
	 * 
	 * @param comDefaultCodeVO
	 * @return
	 */
	public List<CmmnDetailCode> selectCmmCodeDetail(ComDefaultCodeVO comDefaultCodeVO) {
		return selectList("CmmUseDAO.selectCmmCodeDetail", comDefaultCodeVO);
	}

	/**
	 * 怨듯넻肄붾뱶濡??ъ슜??議곗쭅?뺣낫瑜?瑜?遺덈윭?⑤떎.
	 * 
	 * @param comDefaultCodeVO
	 * @return
	 */
	public List<CmmnDetailCode> selectOgrnztIdDetail(ComDefaultCodeVO comDefaultCodeVO) {
		return selectList("CmmUseDAO.selectOgrnztIdDetail", comDefaultCodeVO);
	}

	/**
	 * 怨듯넻肄붾뱶濡??ъ슜?좉렇猷뱀젙蹂대? 瑜?遺덈윭?⑤떎.
	 * 
	 * @param comDefaultCodeVO
	 * @return
	 */
	public List<CmmnDetailCode> selectGroupIdDetail(ComDefaultCodeVO comDefaultCodeVO) {
		return selectList("CmmUseDAO.selectGroupIdDetail", comDefaultCodeVO);
	}
}
