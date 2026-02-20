package egovframework.com.ssi.syi.ist.service;

import java.util.List;

import org.egovframe.rte.psl.dataaccess.util.EgovMap;

/**
 * ?곌퀎?꾪솴??愿???쒕퉬???명꽣?섏씠???대옒?ㅻ? ?뺤쓽?쒕떎
 * 
 * @author 怨듯넻?쒕퉬??媛쒕컻? ?댁쨷??
 * @since 2009.04.01
 * @version 1.0
 * @see
 *
 *      <pre>
 *  == 媛쒖젙?대젰(Modification Information) ==
 *
 *   ?섏젙??     ?섏젙??          ?섏젙?댁슜
 *  -------    --------    ---------------------------
 *   2009.04.01  ?댁쨷??         理쒖큹 ?앹꽦
 *   2025.06.28  ?대갚??         而⑦듃由щ럭??PMD濡??뚰봽?몄썾??蹂댁븞?쎌젏 吏꾨떒?섍퀬 ?쒓굅?섍린-FormalParameterNamingConventions(蹂?섎챸??諛묒쨪 ?ъ슜)
 *
 *      </pre>
 */
public interface EgovCntcSttusService {

	/**
	 * ?곌퀎?꾪솴 ?곸꽭??ぉ??議고쉶?쒕떎.
	 * 
	 * @param cntcMessage
	 * @return CntcMessage(?곌퀎?꾪솴)
	 * @throws Exception
	 */
	CntcSttus selectCntcSttusDetail(CntcSttus cntcSttus) throws Exception;

	/**
	 * ?곌퀎?꾪솴 紐⑸줉??議고쉶?쒕떎.
	 * 
	 * @param searchVO
	 * @return List(?곌퀎?꾪솴 紐⑸줉)
	 * @throws Exception
	 */
	List<EgovMap> selectCntcSttusList(CntcSttusVO searchVO) throws Exception;

	/**
	 * ?곌퀎?꾪솴 珥?媛쒖닔瑜?議고쉶?쒕떎.
	 * 
	 * @param searchVO
	 * @return int(?곌퀎?꾪솴 珥?媛쒖닔)
	 */
	int selectCntcSttusListTotCnt(CntcSttusVO searchVO) throws Exception;

}
