package egovframework.com.uss.ion.yrc.service;

import java.util.List;

/**
 * 媛쒖슂
 * - 媛쒖씤?곗감愿由ъ뿉 ???Service Interface瑜??뺤쓽?쒕떎.
 *
 * ?곸꽭?댁슜
 * - 媛쒖씤?곗감愿由ъ뿉 ????깅줉, ?섏젙, ??젣, 議고쉶 湲곕뒫???쒓났?쒕떎.
 * @author ?닿린??
 * @version 1.0
 * @created 2014.11.14
 */

public interface EgovIndvdlYrycManageService {

	/**
	 * 媛쒖씤?곗감瑜?議고쉶泥섎━?쒕떎.
	 * @param indvdlYrycManage - 媛쒖씤?곗감愿由?model
	 */
	public List<IndvdlYrycManage> selectIndvdlYrycManageList(IndvdlYrycManage indvdlYrycManage) throws Exception;

	/**
	 * ?곗감紐⑸줉 珥?媛쒖닔瑜?議고쉶?쒕떎.
	 * @param indvdlYrycManage - 媛쒖씤?곗감愿由?model
	 */
	public int selectIndvdlYrycManageListTotCnt(IndvdlYrycManage indvdlYrycManage) throws Exception;

	/**
	 * 媛쒖씤?곗감瑜??낅젰泥섎━?쒕떎.
	 * @param indvdlYrycManage - 媛쒖씤?곗감愿由?model
	 */
	public void insertIndvdlYrycManage(IndvdlYrycManage indvdlYrycManage) throws Exception;

	/**
	 * 媛쒖씤?곗감瑜??섏젙?쒕떎.
	 * @param indvdlYrycManage - 媛쒖씤?곗감愿由?model
	 */
	public void updtIndvdlYrycManage(IndvdlYrycManage indvdlYrycManage) throws Exception;

	/**
	 * 媛쒖씤?곗감瑜???젣?쒕떎.
	 * @param indvdlYrycManage - 媛쒖씤?곗감愿由?model
	 */
	public void deleteIndvdlYrycManage(IndvdlYrycManage indvdlYrycManage) throws Exception;

}