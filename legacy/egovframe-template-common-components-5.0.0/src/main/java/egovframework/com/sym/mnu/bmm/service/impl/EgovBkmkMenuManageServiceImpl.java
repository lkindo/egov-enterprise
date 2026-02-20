package egovframework.com.sym.mnu.bmm.service.impl;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.springframework.stereotype.Service;

import egovframework.com.sym.mnu.bmm.service.BkmkMenuManage;
import egovframework.com.sym.mnu.bmm.service.BkmkMenuManageVO;
import egovframework.com.sym.mnu.bmm.service.EgovBkmkMenuManageService;
import egovframework.com.sym.mnu.mpm.service.MenuManageVO;
import jakarta.annotation.Resource;

/**
 * 諛붾줈媛湲곕찓?대? 愿由ы븯???쒕퉬??援ы쁽 ?대옒??
 * 
 * @author 怨듯넻 而댄룷?뚰듃 媛쒕컻? ?ㅼ꽦濡?
 * @since 2009.09.25
 * @version 1.0
 * @see
 *
 *      <pre>
 *  == 媛쒖젙?대젰(Modification Information) ==
 *
 *   ?섏젙??     ?섏젙??          ?섏젙?댁슜
 *  -------    --------    ---------------------------
 *   2009.09.25  ?ㅼ꽦濡?         理쒖큹 ?앹꽦
 *   2025.07.15  ?대갚??         2025??而⑦듃由щ럭??PMD濡??뚰봽?몄썾??蹂댁븞?쎌젏 吏꾨떒?섍퀬 ?쒓굅?섍린-FormalParameterNamingConventions(蹂?섎챸??諛묒쨪 ?ъ슜)
 *
 *      </pre>
 */
@Service("bkmkMenuManageservice")
public class EgovBkmkMenuManageServiceImpl extends EgovAbstractServiceImpl implements EgovBkmkMenuManageService {

	@Resource(name = "bkmkMenuManageDAO")
	private BkmkMenuManageDAO bkmkMenuManageDAO;

	/**
	 * 諛붾줈媛湲곕찓?닿?由??뺣낫瑜???젣?쒕떎.
	 * 
	 * @param BkmkMenuManage
	 * @return
	 * @exception Exception
	 */
	@Override
	public void deleteBkmkMenuManage(BkmkMenuManage bkmkMenuManage) throws Exception {
		bkmkMenuManageDAO.deleteBkmkMenuManage(bkmkMenuManage);
	}

	/**
	 * 諛붾줈媛湲곕찓?닿?由??뺣낫瑜??깅줉?쒕떎.
	 * 
	 * @param BkmkMenuManage
	 * @return
	 * @exception Exception
	 */
	@Override
	public void insertBkmkMenuManage(BkmkMenuManage bkmkMenuManage) throws Exception {
		bkmkMenuManageDAO.insertBkmkMenuManage(bkmkMenuManage);
	}

	/**
	 * 諛붾줈媛湲곕찓?닿?由??뺣낫???꾩껜紐⑸줉??議고쉶?쒕떎.
	 * 
	 * @param BkmkMenuManage
	 * @return Map<String, Object>
	 * @exception Exception
	 */
	@Override
	public Map<String, Object> selectBkmkMenuManageList(BkmkMenuManageVO bkmkMenuManageVO) throws Exception {

		List<BkmkMenuManageVO> result = bkmkMenuManageDAO.selectBkmkMenuManageList(bkmkMenuManageVO);

		int cnt = bkmkMenuManageDAO.selectBkmkMenuManageListCnt(bkmkMenuManageVO);

		Map<String, Object> map = new HashMap<String, Object>();

		map.put("resultList", result);
		map.put("resultCnt", Integer.toString(cnt));

		return map;
	}

	/**
	 * 諛붾줈媛湲곕찓?닿?由??뺣낫瑜?議고쉶?쒕떎.
	 * 
	 * @param BkmkMenuManageVO
	 * @return BkmkMenuManageVO
	 * @exception Exception
	 */
	@Override
	public BkmkMenuManageVO selectBkmkMenuManageResult(BkmkMenuManageVO bkmkMenuManageVO) throws Exception {

		return bkmkMenuManageDAO.selectBkmkMenuManageResult(bkmkMenuManageVO);
	}

	/**
	 * ?깅줉??硫붾돱?뺣낫 紐⑸줉??議고쉶?쒕떎.
	 * 
	 * @param BkmkMenuManageVO
	 * @return Map<String, Object>
	 * @exception Exception
	 */
	@Override
	public Map<String, Object> selectMenuList(BkmkMenuManageVO bkmkMenuManageVO) throws Exception {

		List<BkmkMenuManageVO> result = bkmkMenuManageDAO.selectBkmkMenuList(bkmkMenuManageVO);

		int cnt = bkmkMenuManageDAO.selectBkmkMenuListCnt(bkmkMenuManageVO);

		Map<String, Object> map = new HashMap<String, Object>();

		map.put("resultList", result);
		map.put("resultCnt", Integer.toString(cnt));

		return map;

	}

	/**
	 * 誘몃━蹂닿린瑜???諛붾줈媛湲곕찓?닿?由ъ쓽 紐⑸줉??議고쉶?쒕떎.
	 * 
	 * @param BkmkMenuManageVO
	 * @return List<MenuManageVO>
	 * @throws Exception
	 */
	@Override
	public List<MenuManageVO> selectBkmkPreviewList(BkmkMenuManageVO bkmkMenuManageVO) throws Exception {
		return bkmkMenuManageDAO.selectBkmkPreview(bkmkMenuManageVO);
	}

	/**
	 * ?좏깮??硫붾돱??URL ??議고쉶?쒕떎.
	 * 
	 * @param bkmkMenuManage
	 * @return
	 * @throws Exception
	 */
	@Override
	public String selectUrl(BkmkMenuManage bkmkMenuManage) throws Exception {

		return bkmkMenuManageDAO.selectUrl(bkmkMenuManage);
	}
}
