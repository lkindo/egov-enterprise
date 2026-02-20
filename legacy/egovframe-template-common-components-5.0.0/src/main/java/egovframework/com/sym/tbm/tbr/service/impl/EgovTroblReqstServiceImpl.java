package egovframework.com.sym.tbm.tbr.service.impl;

import java.util.List;

import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.springframework.stereotype.Service;

import egovframework.com.sym.tbm.tbr.service.EgovTroblReqstService;
import egovframework.com.sym.tbm.tbr.service.TroblReqst;
import egovframework.com.sym.tbm.tbr.service.TroblReqstVO;
import jakarta.annotation.Resource;

/**
 * 媛쒖슂
 * - ?μ븷?좎껌 ?뺣낫?????ServiceImpl ?대옒?ㅻ? ?뺤쓽?쒕떎.
 *
 * ?곸꽭?댁슜
 * - ?μ븷?좎껌 ?뺣낫??????깅줉, ?섏젙, ??젣, 議고쉶 ?깆쓽 湲곕뒫???쒓났?쒕떎.
 * - ?μ븷?좎껌 ?뺣낫??議고쉶湲곕뒫? 紐⑸줉議고쉶, ?곸꽭議고쉶濡?援щ텇?쒕떎.
 * @author lee.m.j
 * @version 1.0
 * @created 28-6-2010 ?ㅼ쟾 10:44:35
 */
@Service("egovTroblReqstService")
public class EgovTroblReqstServiceImpl extends EgovAbstractServiceImpl implements EgovTroblReqstService {

	@Resource(name="troblReqstDAO")
	private TroblReqstDAO troblReqstDAO;

	/**
	 * ?μ븷?붿껌??愿由ы븯湲??꾪빐 ?깅줉???μ븷?붿껌紐⑸줉??議고쉶?쒕떎.
	 * @param troblReqstVO - ?μ븷愿由?Vo
	 * @return List - ?μ븷?붿껌 紐⑸줉
	 */
	@Override
	public List<TroblReqstVO> selectTroblReqstList(TroblReqstVO troblReqstVO) throws Exception {
		return troblReqstDAO.selectTroblReqstList(troblReqstVO);
	}

	/**
	 * ?μ븷?붿껌紐⑸줉 珥?媛쒖닔瑜?議고쉶?쒕떎.
	 * @param troblReqstVO - ?μ븷?좎껌愿由?Vo
	 * @return int - ?μ븷?붿껌 移댁슫????
	 */
	@Override
	public int selectTroblReqstListTotCnt(TroblReqstVO troblReqstVO) throws Exception {
		return troblReqstDAO.selectTroblReqstListTotCnt(troblReqstVO);
	}

	/**
	 * ?깅줉???μ븷?붿껌???곸꽭?뺣낫瑜?議고쉶?쒕떎.
	 * @param troblReqstVO - ?μ븷?좎껌愿由?Vo
	 * @return troblReqstVO - ?μ븷?좎껌愿由?Vo
	 */
	@Override
	public TroblReqstVO selectTroblReqst(TroblReqstVO troblReqstVO) throws Exception {
		return troblReqstDAO.selectTroblReqst(troblReqstVO);
	}

	/**
	 * ?μ븷?붿껌?뺣낫瑜??좉퇋濡??깅줉?쒕떎.
	 * @param troblReqst - ?μ븷?좎껌 model
	 * @param troblReqstVO - ?μ븷?좎껌愿由?Vo
	 */
	@Override
	public TroblReqstVO insertTroblReqst(TroblReqst troblReqst, TroblReqstVO troblReqstVO) throws Exception {
		troblReqstDAO.insertTroblReqst(troblReqst);
		troblReqstVO.setTroblId(troblReqst.getTroblId());
		return troblReqstDAO.selectTroblReqst(troblReqstVO);
	}

	/**
	 * 湲??깅줉???μ븷?붿껌?뺣낫瑜??섏젙?쒕떎.
	 * @param troblReqst - ?μ븷?좎껌 model
	 */
	@Override
	public void updateTroblReqst(TroblReqst troblReqst) throws Exception {
		troblReqstDAO.updateTroblReqst(troblReqst);
	}

	/**
	 * 湲??깅줉???μ븷?붿껌?뺣낫瑜???젣?쒕떎.
	 * @param troblReqst - ?μ븷?좎껌 model
	 */
	@Override
	public void deleteTroblReqst(TroblReqst troblReqst) throws Exception {
		troblReqstDAO.deleteTroblReqst(troblReqst);
	}

	/**
	 * ?μ븷泥섎━瑜??붿껌?쒕떎.
	 * @param troblReqst - ?μ븷?좎껌 model
	 */
	@Override
	public void requstTroblReqst(TroblReqst troblReqst) throws Exception {
		troblReqstDAO.requstTroblReqst(troblReqst);
	}
}