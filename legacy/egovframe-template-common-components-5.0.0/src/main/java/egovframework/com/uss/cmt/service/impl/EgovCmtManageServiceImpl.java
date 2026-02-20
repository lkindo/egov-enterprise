package egovframework.com.uss.cmt.service.impl;

import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.List;

import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.egovframe.rte.fdl.idgnr.EgovIdGnrService;
import org.springframework.stereotype.Service;

import com.ibm.icu.util.Calendar;

import egovframework.com.cmm.EgovMessageSource;
import egovframework.com.uss.cmt.service.CmtDefaultVO;
import egovframework.com.uss.cmt.service.CmtManageVO;
import egovframework.com.uss.cmt.service.EgovCmtManageService;
import jakarta.annotation.Resource;

/**
 * 異쒗눜洹쇨?由ъ뿉 愿??鍮꾩??덉뒪 ?대옒?ㅻ? ?뺤쓽?쒕떎.
 * 
 * @author ?쒖??꾨젅?꾩썙??媛쒕컻?
 * @since 2009.04.10
 * @version 1.0
 * @see
 *
 *      <pre>
 *  == 媛쒖젙?대젰(Modification Information) ==
 *
 *   ?섏젙??     ?섏젙??          ?섏젙?댁슜
 *  -------    --------    ---------------------------
 *   2009.04.10  媛쒕컻?          理쒖큹 ?앹꽦
 *   2025.08.01  ?대갚??         2025??而⑦듃由щ럭??PMD濡??뚰봽?몄썾??蹂댁븞?쎌젏 吏꾨떒?섍퀬 ?쒓굅?섍린-SimpleDateFormatNeedsLocale(SimpleDateFormat ?몄뒪?댁뒪瑜??앹꽦?좊븣 Locale ??吏?뺥븯??寃껋씠 諛붾엺吏곹븿)
 *   2025.08.01  ?대갚??         2025??而⑦듃由щ럭??PMD濡??뚰봽?몄썾??蹂댁븞?쎌젏 吏꾨떒?섍퀬 ?쒓굅?섍린-AvoidReassigningParameters(?섍꺼諛쏅뒗 硫붿냼??parameter 媛믪쓣 吏곸젒 蹂寃쏀븯??肄붾뱶 ?먯?)
 *
 *      </pre>
 */
@Service("cmtManageService")
public class EgovCmtManageServiceImpl extends EgovAbstractServiceImpl implements EgovCmtManageService {

	/** cmtManageDAO */
	@Resource(name = "cmtManageDAO")
	private EgovCmtManageDAO cmtManageDAO;

	/** egovCmtManageIdGnrService */
	@Resource(name = "egovCmtManageIdGnrService")
	private EgovIdGnrService idgenService;

	/** EgovMessageSource */
	@Resource(name = "egovMessageSource")
	EgovMessageSource egovMessageSource;

	/**
	 * 異쒗눜洹쇱젙蹂?紐⑸줉 ?붾㈃??異쒕젰
	 * 
	 * @param DeptInfo (遺?쒕퀎 - optional) 寃?됱“嫄?
	 * @return List<CmtManageVO> ?낅Т?ъ슜??紐⑸줉?뺣낫
	 * @throws Exception
	 */
	@Override
	public List<CmtManageVO> selectCmtInfoList(CmtDefaultVO cmtSearchVO) throws Exception {
		List<CmtManageVO> result = cmtManageDAO.selectCmtInfoList(cmtSearchVO);
		return result;
	}

	/**
	 * 異쒓렐?뺣낫 ?낅젰, ?붾컮?댁뒪瑜??듯빐 ?몃? ?곌퀎?낅젰媛??
	 * 
	 * @param cmtManageVO瑜??깅줉?뺣낫
	 * @return result ?깅줉寃곌낵
	 * @throws Exception
	 */
	@Override
	public String insertWrkStartCmtInfo(CmtManageVO cmtManageVO) throws Exception {

		// Key
		String wrktmId = idgenService.getNextStringId();
		cmtManageVO.setWrktmId(wrktmId);

		// 異쒓렐?쒓컙
		Date date = Calendar.getInstance().getTime();
		String wrkStartTime = new SimpleDateFormat("HH:mm").format(date); // NOPMD - SimpleDateFormatNeedsLocale
		cmtManageVO.setWrkStartTime(wrkStartTime);

		return cmtManageDAO.insertWrkStartCmtInfo(cmtManageVO);
	}

	/**
	 * ?닿렐 ?뺣낫 ?낅젰???꾪븳 wrktm id ?뺤씤
	 * 
	 * @param cmtManageVO 寃?됱“嫄?
	 * @return 珥앹궗?⑹옄媛쒖닔(int)
	 * @throws Exception
	 */
	@Override
	public String selectWrktmId(CmtManageVO cmtManageVO) throws Exception {

		return cmtManageDAO.selectWrktmId(cmtManageVO);
	}

	/**
	 * ?닿렐 ?뺣낫 ?낅젰
	 * 
	 * @param cmtManageVO瑜??깅줉?뺣낫
	 * @return result ?깅줉寃곌낵
	 * @throws Exception
	 */
	@Override
	public int insertWrkEndCmtInfo(CmtManageVO cmtManageVO) throws Exception {

		CmtManageVO resultVO = cmtManageDAO.selectWrkStartInfo(cmtManageVO);

		// ?닿렐?쒓컙
		Date date = Calendar.getInstance().getTime();
		String wrkEndTime = new SimpleDateFormat("HH:mm").format(date); // NOPMD - SimpleDateFormatNeedsLocale
		resultVO.setWrkEndTime(wrkEndTime);

		// ?뚯궗蹂?Rule 湲곕컲?쇰줈 workhour / overtime_workhour瑜?寃곗젙?쒕떎. ex) DB ?곕룞?쒖슜
		resultVO.setWrkHours("8");
		resultVO.setOvtmwrkHours("0");
		// 異쒗눜洹쇱떆媛?Rule 湲곕컲?쇰줈 異쒗눜洹쇱긽?쒕? 援щ텇?쒕떎. ex) ?뺤긽/吏媛?議고쉶
		String msg = egovMessageSource.getMessage("ussCmt.cmtManageServiceImpl.normal");
		resultVO.setWrkStartStatus(msg);
		resultVO.setWrkEndStatus(msg);

		return cmtManageDAO.insertWrkEndCmtInfo(resultVO);
	}

}