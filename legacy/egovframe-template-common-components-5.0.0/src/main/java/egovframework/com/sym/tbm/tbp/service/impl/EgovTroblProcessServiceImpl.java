package egovframework.com.sym.tbm.tbp.service.impl;

import java.util.List;

import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.springframework.stereotype.Service;

import egovframework.com.sym.tbm.tbp.service.EgovTroblProcessService;
import egovframework.com.sym.tbm.tbp.service.TroblProcess;
import egovframework.com.sym.tbm.tbp.service.TroblProcessVO;
import jakarta.annotation.Resource;

/**
 * 媛쒖슂
 * - ?μ븷泥섎━寃곌낵 愿由ъ젙蹂댁뿉 ???ServiceImpl ?대옒?ㅻ? ?뺤쓽?쒕떎.
 *
 * ?곸꽭?댁슜
 * - ?μ븷泥섎━寃곌낵 愿由ъ젙蹂댁뿉 ????깅줉, ?섏젙, ??젣, 議고쉶 ?깆쓽 湲곕뒫???쒓났?쒕떎.
 * - ?μ븷泥섎━寃곌낵 愿由ъ젙蹂댁쓽 議고쉶湲곕뒫? 紐⑸줉議고쉶, ?곸꽭議고쉶濡?援щ텇?쒕떎.
 * @author lee.m.j
 * @version 1.0
 * @created 28-6-2010 ?ㅼ쟾 10:44:35
 */
@Service("egovTroblProcessService")
public class EgovTroblProcessServiceImpl extends EgovAbstractServiceImpl implements EgovTroblProcessService {

	@Resource(name="troblProcessDAO")
	private TroblProcessDAO troblProcessDAO;

	/**
	 * ?μ븷泥섎━?뺣낫瑜?愿由ы븯湲??꾪빐 ????μ븷泥섎━紐⑸줉??議고쉶?쒕떎.
	 * @param troblProcessVO - ?μ븷泥섎━寃곌낵 Vo
	 * @return List - ?μ븷泥섎━寃곌낵 紐⑸줉
	 */
	@Override
	public List<TroblProcessVO> selectTroblProcessList(TroblProcessVO troblProcessVO) throws Exception {
		return troblProcessDAO.selectTroblProcessList(troblProcessVO);
	}

	/**
	 * ?μ븷泥섎━紐⑸줉 珥?媛쒖닔瑜?議고쉶?쒕떎.
	 * @param troblProcessVO - ?μ븷泥섎━寃곌낵 Vo
	 * @return int - ?μ븷泥섎━寃곌낵 移댁슫????
	 */
	@Override
	public int selectTroblProcessListTotCnt(TroblProcessVO troblProcessVO) throws Exception {
		return troblProcessDAO.selectTroblProcessListTotCnt(troblProcessVO);
	}

	/**
	 * ?깅줉???μ븷泥섎━???곸꽭?뺣낫瑜?議고쉶?쒕떎.
	 * @param troblProcessVO - ?μ븷泥섎━寃곌낵 Vo
	 * @return troblProcessVO - ?μ븷泥섎━寃곌낵 Vo
	 */
	@Override
	public TroblProcessVO selectTroblProcess(TroblProcessVO troblProcessVO) throws Exception {
		return troblProcessDAO.selectTroblProcess(troblProcessVO);
	}

	/**
	 * ?μ븷泥섎━?뺣낫瑜??좉퇋濡??깅줉?쒕떎.
	 * @param troblProcessVO - ?μ븷泥섎━寃곌낵 model
	 */
	@Override
	public void insertTroblProcess(TroblProcess troblProcess) throws Exception {
		troblProcessDAO.insertTroblProcess(troblProcess);
	}

	/**
	 * 湲??깅줉???μ븷泥섎━?뺣낫瑜???젣?쒕떎.
	 * @param troblProcessVO - ?μ븷泥섎━寃곌낵 model
	 */
	@Override
	public void deleteTroblProcess(TroblProcess troblProcess) throws Exception {
		troblProcessDAO.deleteTroblProcess(troblProcess);
	}

}
