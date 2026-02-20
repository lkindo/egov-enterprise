package egovframework.com.ssi.syi.ist.service.impl;

import java.util.List;

import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.egovframe.rte.psl.dataaccess.util.EgovMap;
import org.springframework.stereotype.Service;

import egovframework.com.ssi.syi.ist.service.CntcSttus;
import egovframework.com.ssi.syi.ist.service.CntcSttusVO;
import egovframework.com.ssi.syi.ist.service.EgovCntcSttusService;
import jakarta.annotation.Resource;

/**
 * ?곌퀎?꾪솴??????쒕퉬??援ы쁽?대옒?ㅻ? ?뺤쓽?쒕떎.
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
 *   2025.06.30  ?대갚??         而⑦듃由щ럭??PMD濡??뚰봽?몄썾??蹂댁븞?쎌젏 吏꾨떒?섍퀬 ?쒓굅?섍린-FormalParameterNamingConventions(蹂?섎챸??諛묒쨪 ?ъ슜)
 *
 *      </pre>
 */
@Service("CntcSttusService")
public class EgovCntcSttusServiceImpl extends EgovAbstractServiceImpl implements EgovCntcSttusService {

	@Resource(name = "CntcSttusDAO")
	private CntcSttusDAO cntcSttusDAO;

	/**
	 * ?곌퀎?꾪솴 ?곸꽭??ぉ??議고쉶?쒕떎.
	 */
	@Override
	public CntcSttus selectCntcSttusDetail(CntcSttus cntcSttus) throws Exception {
		CntcSttus ret = cntcSttusDAO.selectCntcSttusDetail(cntcSttus);
		return ret;
	}

	/**
	 * ?곌퀎?꾪솴 紐⑸줉??議고쉶?쒕떎.
	 */
	@Override
	public List<EgovMap> selectCntcSttusList(CntcSttusVO searchVO) throws Exception {
		return cntcSttusDAO.selectCntcSttusList(searchVO);
	}

	/**
	 * ?곌퀎?꾪솴 珥?媛쒖닔瑜?議고쉶?쒕떎.
	 */
	@Override
	public int selectCntcSttusListTotCnt(CntcSttusVO searchVO) throws Exception {
		return cntcSttusDAO.selectCntcSttusListTotCnt(searchVO);
	}

}
