package egovframework.com.uss.ion.yrc.service.impl;

import java.util.List;

import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.springframework.stereotype.Service;

import egovframework.com.uss.ion.yrc.service.EgovIndvdlYrycManageService;
import egovframework.com.uss.ion.yrc.service.IndvdlYrycManage;
import jakarta.annotation.Resource;

/**
 * 媛쒖슂
 * - ?곗감愿由ъ뿉 ???ServiceImpl ?대옒?ㅻ? ?뺤쓽?쒕떎.
 *
 * ?곸꽭?댁슜
 * - ?곗감愿由ъ뿉 ????깅줉, ?섏젙, ??젣, 議고쉶 湲곕뒫???쒓났?쒕떎.
 * - ?곗감愿由ъ쓽 議고쉶湲곕뒫? 紐⑸줉議고쉶濡?援щ텇?쒕떎.
 * @author ?닿린??
 * @version 1.0
 * @created 2014.11.14
 */

@Service("egovIndvdlYrycManageService")
public class EgovIndvdlYrycManageServiceImpl extends EgovAbstractServiceImpl implements EgovIndvdlYrycManageService {

	@Resource(name="indvdlYrycDAO")
    private IndvdlYrycDAO indvdlYrycDAO;

	/**
	 * 媛쒖씤蹂??곗감瑜?議고쉶 泥섎━?쒕떎.
	 * @param indvdlYrycManage - ?곗감愿由?model
	 */
	@Override
	public List<IndvdlYrycManage> selectIndvdlYrycManageList(IndvdlYrycManage indvdlYrycManage) throws Exception {
		List<IndvdlYrycManage> result = indvdlYrycDAO.selectIndvdlYrycManageList(indvdlYrycManage);
		return result;
	}

	/**
	 * 媛쒖씤蹂??곗감 由ъ뒪??媛쒖닔瑜?議고쉶 泥섎━?쒕떎.
	 * @param indvdlYrycManage - ?곗감愿由?model
	 */
	@Override
	public int selectIndvdlYrycManageListTotCnt(IndvdlYrycManage indvdlYrycManage) throws Exception {
		return indvdlYrycDAO.selectIndvdlYrycManageListTotCnt(indvdlYrycManage);
	}

	/**
	 * 媛쒖씤蹂??곗감瑜??낅젰 泥섎━?쒕떎.
	 * @param indvdlYrycManage - ?곗감愿由?model
	 */
	@Override
	public void insertIndvdlYrycManage(IndvdlYrycManage indvdlYrycManage) throws Exception {
		indvdlYrycDAO.insertIndvdlYrycManage(indvdlYrycManage);
	}

	/**
	 * 媛쒖씤蹂??곗감瑜??섏젙 泥섎━?쒕떎.
	 * @param indvdlYrycManage - ?곗감愿由?model
	 */
	@Override
	public void updtIndvdlYrycManage(IndvdlYrycManage indvdlYrycManage) throws Exception {
		indvdlYrycDAO.updtIndvdlYrycManage(indvdlYrycManage);
	}

	/**
	 * 媛쒖씤蹂??곗감瑜???젣 泥섎━?쒕떎.
	 * @param indvdlYrycManage - ?곗감愿由?model
	 */
	@Override
	public void deleteIndvdlYrycManage(IndvdlYrycManage indvdlYrycManage) throws Exception {
		indvdlYrycDAO.deleteIndvdlYrycManage(indvdlYrycManage);
	}

}
