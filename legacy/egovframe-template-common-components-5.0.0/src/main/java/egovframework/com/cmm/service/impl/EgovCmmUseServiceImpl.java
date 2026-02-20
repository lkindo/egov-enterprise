package egovframework.com.cmm.service.impl;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.springframework.stereotype.Service;

import egovframework.com.cmm.ComDefaultCodeVO;
import egovframework.com.cmm.service.CmmnDetailCode;
import egovframework.com.cmm.service.EgovCmmUseService;
import jakarta.annotation.Resource;

/**
 * 怨듯넻肄붾뱶???꾩껜 ?낅Т?먯꽌 怨듭슜?댁꽌 ?ъ슜?댁빞 ?섎뒗 ?쒕퉬?ㅻ? ?뺤쓽?섍린?꾪븳 ?쒕퉬??援ы쁽 ?대옒??
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
 *   2024.10.29  ?대갚??         @Override ?쒓린
 *   2025.07.16  ?대갚??         2025??而⑦듃由щ럭??`throws Exception` ?쒓굅
 *
 *      </pre>
 */
@Service("EgovCmmUseService")
public class EgovCmmUseServiceImpl extends EgovAbstractServiceImpl implements EgovCmmUseService {

    @Resource(name = "cmmUseDAO")
    private CmmUseDAO cmmUseDAO;

	/**
	 * 怨듯넻肄붾뱶瑜?議고쉶?쒕떎.
	 *
	 * @param comDefaultCodeVO
	 * @return
	 */
	@Override
	public List<CmmnDetailCode> selectCmmCodeDetail(ComDefaultCodeVO comDefaultCodeVO) {
		return cmmUseDAO.selectCmmCodeDetail(comDefaultCodeVO);
	}

	/**
	 * ComDefaultCodeVO??由ъ뒪?몃? 諛쏆븘???щ윭媛쒖쓽 肄붾뱶 由ъ뒪?몃? 留듭뿉 ?댁븘??由ы꽩?쒕떎.
	 *
	 * @param comDefaultCodeVOs
	 * @return
	 */
	@Override
	public Map<String, List<CmmnDetailCode>> selectCmmCodeDetails(List<ComDefaultCodeVO> comDefaultCodeVOs) {
		Map<String, List<CmmnDetailCode>> map = new HashMap<>();
		for (ComDefaultCodeVO comDefaultCodeVO : comDefaultCodeVOs) {
			map.put(comDefaultCodeVO.getCodeId(), cmmUseDAO.selectCmmCodeDetail(comDefaultCodeVO));
		}
		return map;
	}

	/**
	 * 議곗쭅?뺣낫瑜?肄붾뱶?뺥깭濡?由ы꽩?쒕떎.
	 *
	 * @param 議고쉶議곌굔?뺣낫 vo
	 * @return 議곗쭅?뺣낫 List
	 */
	@Override
	public List<CmmnDetailCode> selectOgrnztIdDetail(ComDefaultCodeVO comDefaultCodeVO) {
		return cmmUseDAO.selectOgrnztIdDetail(comDefaultCodeVO);
	}

	/**
	 * 洹몃９?뺣낫瑜?肄붾뱶?뺥깭濡?由ы꽩?쒕떎.
	 *
	 * @param 議고쉶議곌굔?뺣낫 vo
	 * @return 洹몃９?뺣낫 List
	 */
	@Override
	public List<CmmnDetailCode> selectGroupIdDetail(ComDefaultCodeVO comDefaultCodeVO) {
		return cmmUseDAO.selectGroupIdDetail(comDefaultCodeVO);
	}
}
