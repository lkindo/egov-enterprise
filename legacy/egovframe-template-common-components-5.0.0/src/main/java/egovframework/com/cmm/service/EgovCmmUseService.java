package egovframework.com.cmm.service;

import java.util.List;
import java.util.Map;

import egovframework.com.cmm.ComDefaultCodeVO;

/**
 * 怨듯넻肄붾뱶???꾩껜 ?낅Т?먯꽌 怨듭슜?댁꽌 ?ъ슜?댁빞 ?섎뒗 ?쒕퉬?ㅻ? ?뺤쓽?섍린 ?꾪븳 ?쒕퉬???명꽣?섏씠??
 * 
 * @author 怨듯넻?쒕퉬??媛쒕컻? ?댁궪??
 * @since 2009.04.01
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
public interface EgovCmmUseService {

	/**
	 * 怨듯넻肄붾뱶瑜?議고쉶?쒕떎.
	 *
	 * @param comDefaultCodeVO
	 * @return List(肄붾뱶)
	 */
	public List<CmmnDetailCode> selectCmmCodeDetail(ComDefaultCodeVO comDefaultCodeVO);

	/**
	 * ComDefaultCodeVO??由ъ뒪?몃? 諛쏆븘???щ윭媛쒖쓽 肄붾뱶 由ъ뒪?몃? 留듭뿉 ?댁븘??由ы꽩?쒕떎.
	 *
	 * @param comDefaultCodeVOs
	 * @return Map(肄붾뱶)
	 */
	public Map<String, List<CmmnDetailCode>> selectCmmCodeDetails(List<ComDefaultCodeVO> comDefaultCodeVOs);

	/**
	 * 議곗쭅?뺣낫瑜?肄붾뱶?뺥깭濡?由ы꽩?쒕떎.
	 *
	 * @param 議고쉶議곌굔?뺣낫 vo
	 * @return 議곗쭅?뺣낫 List
	 */
	public List<CmmnDetailCode> selectOgrnztIdDetail(ComDefaultCodeVO comDefaultCodeVO);

	/**
	 * 洹몃９?뺣낫瑜?肄붾뱶?뺥깭濡?由ы꽩?쒕떎.
	 *
	 * @param 議고쉶議곌굔?뺣낫 vo
	 * @return 洹몃９?뺣낫 List
	 */
	public List<CmmnDetailCode> selectGroupIdDetail(ComDefaultCodeVO comDefaultCodeVO);
}
