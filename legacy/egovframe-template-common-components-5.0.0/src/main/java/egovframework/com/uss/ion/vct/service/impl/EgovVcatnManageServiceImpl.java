package egovframework.com.uss.ion.vct.service.impl;

import java.util.Calendar;
import java.util.List;

import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import egovframework.com.cmm.LoginVO;
import egovframework.com.cmm.util.EgovUserDetailsHelper;
import egovframework.com.uss.ion.ism.service.EgovInfrmlSanctnService;
import egovframework.com.uss.ion.ism.service.InfrmlSanctn;
import egovframework.com.uss.ion.vct.service.EgovVcatnManageService;
import egovframework.com.uss.ion.vct.service.IndvdlYrycManage;
import egovframework.com.uss.ion.vct.service.VcatnManage;
import egovframework.com.uss.ion.vct.service.VcatnManageVO;
import egovframework.com.utl.fcc.service.EgovDateUtil;
import egovframework.com.utl.fcc.service.EgovStringUtil;
import jakarta.annotation.Resource;

/**
 * <pre>
 * 媛쒖슂
 * - ?닿?愿由ъ뿉 ???ServiceImpl ?대옒?ㅻ? ?뺤쓽?쒕떎.
 *
 * ?곸꽭?댁슜
 * - ?닿?愿由ъ뿉 ????깅줉, ?섏젙, ??젣, 議고쉶, 諛섏쁺?뺤씤 湲곕뒫???쒓났?쒕떎.
 * - ?닿?愿由ъ쓽 議고쉶湲곕뒫? 紐⑸줉議고쉶, ?곸꽭議고쉶濡?援щ텇?쒕떎.
 * </pre>
 * 
 * @author ?댁슜
 * @since 2010.06.15
 * @version 1.0
 * @see
 *
 *      <pre>
 *  == 媛쒖젙?대젰(Modification Information) ==
 *
 *   ?섏젙??     ?섏젙??          ?섏젙?댁슜
 *  -------    --------    ---------------------------
 *   2010.06.15  ?댁슜           理쒖큹 ?앹꽦
 *   2025.08.18  ?대갚??         2025??而⑦듃由щ럭??PMD濡??뚰봽?몄썾??蹂댁븞?쎌젏 吏꾨떒?섍퀬 ?쒓굅?섍린-LocalVariableNamingConventions(final???꾨땶 蹂?섎뒗 諛묒쨪???ы븿?????놁쓬)
 *
 *      </pre>
 */
@Service("egovVcatnManageService")
public class EgovVcatnManageServiceImpl extends EgovAbstractServiceImpl implements EgovVcatnManageService {

	@Resource(name = "vcatnManageDAO")
	private VcatnManageDAO vcatnManageDAO;

	@Resource(name = "EgovInfrmlSanctnService")
	protected EgovInfrmlSanctnService infrmlSanctnService;

	private static final Logger LOGGER = LoggerFactory.getLogger(EgovVcatnManageServiceImpl.class);

	/**
	 * ?닿?愿由ъ젙蹂대? 愿由ы븯湲??꾪빐 ?깅줉???닿?愿由?紐⑸줉??議고쉶?쒕떎.
	 * 
	 * @param vcatnManageVO - ?닿?愿由?VO
	 * @return List - ?닿?愿由?紐⑸줉
	 */
	@Override
	public List<VcatnManageVO> selectVcatnManageList(VcatnManageVO vcatnManageVO) throws Exception {

		List<VcatnManageVO> result = vcatnManageDAO.selectVcatnManageList(vcatnManageVO);
		int num = result.size();

		for (int i = 0; i < num; i++) {
			VcatnManageVO vcatnManageVO1 = result.get(i);
			vcatnManageVO1.setBgnde(EgovDateUtil.formatDate(vcatnManageVO1.getBgnde(), "-"));
			vcatnManageVO1.setEndde(EgovDateUtil.formatDate(vcatnManageVO1.getEndde(), "-"));
			result.set(i, vcatnManageVO1);
		}
		return result;
	}

	/**
	 * ?닿?愿由щぉ濡?珥?媛쒖닔瑜?議고쉶?쒕떎.
	 * 
	 * @param vcatnManageVO - ?닿?愿由?VO
	 * @return int - ?닿?愿由?移댁슫????
	 */
	@Override
	public int selectVcatnManageListTotCnt(VcatnManageVO vcatnManageVO) throws Exception {
		return vcatnManageDAO.selectVcatnManageListTotCnt(vcatnManageVO);
	}

	/**
	 * ?깅줉???닿?愿由ъ쓽 ?곸꽭?뺣낫瑜?議고쉶?쒕떎.
	 * 
	 * @param vcatnManageVO - ?닿?愿由?VO
	 * @return VcatnManageVO - ?닿?愿由?VO
	 */
	@Override
	public VcatnManageVO selectVcatnManage(VcatnManageVO vcatnManageVO) throws Exception {

		// VcatnManageVO vcatnManageVOTemp = new VcatnManageVO();

		VcatnManageVO vcatnManageVOTemp = vcatnManageDAO.selectVcatnManage(vcatnManageVO);
		vcatnManageVOTemp.setBgnde(EgovDateUtil.formatDate(vcatnManageVOTemp.getBgnde(), "-"));
		vcatnManageVOTemp.setEndde(EgovDateUtil.formatDate(vcatnManageVOTemp.getEndde(), "-"));

		// ?곗감?뺣낫
		VcatnManageVO vcatnManageVO1 = selectIndvdlYrycManage(vcatnManageVO.getApplcntId());
		vcatnManageVOTemp.setOccrrncYear(vcatnManageVO1.getOccrrncYear());
		vcatnManageVOTemp.setUsid(vcatnManageVO1.getUsid());
		vcatnManageVOTemp.setOccrncYrycCo(vcatnManageVO1.getOccrncYrycCo());
		vcatnManageVOTemp.setUseYrycCo(vcatnManageVO1.getUseYrycCo());
		vcatnManageVOTemp.setRemndrYrycCo(vcatnManageVO1.getRemndrYrycCo());

		return vcatnManageVOTemp;
	}

	/**
	 * ?닿?愿由ъ젙蹂대? ?좉퇋濡??깅줉?쒕떎.
	 * 
	 * @param vcatnManage - ?닿?愿由?model
	 * @return String 01 : ?낅젰?깃났, 02 : ?곗감?닿? ?깅줉?ㅽ뙣(?붿뿬?곗감 遺議?, 03: 諛섏감?닿? ?깅줉?ㅽ뙣(?붿뿬?곗감 遺議?
	 */
	@Override
	public String insertVcatnManage(VcatnManage vcatnManage, VcatnManageVO vcatnManageVO) throws Exception {
		java.util.Calendar cal = java.util.Calendar.getInstance();
		String sYear = Integer.toString(cal.get(java.util.Calendar.YEAR));
		String sMonth = Integer.toString(cal.get(java.util.Calendar.MONTH) + 1);
		if (sMonth.length() == 1) {
			sMonth = "0" + sMonth;
		}
		String sDay = Integer.toString(cal.get(java.util.Calendar.DATE));

		LoginVO user = (LoginVO) EgovUserDetailsHelper.getAuthenticatedUser();
		// KISA 蹂댁븞痍⑥빟??議곗튂 (2018-12-10, ?좎슜??
		String uniqId = "";
		if (user != null) {
			uniqId = user.getUniqId();
		}
		vcatnManage.setOccrrncYear(sYear);
		vcatnManage.setReqstDe(sYear + sMonth + sDay);
		/*
		 * ?닿? ?뱀씤泥섎━ ?좎껌 infrmlSanctnService.insertInfrmlSanctn("000", vcatnManage);
		 */
		vcatnManage.setBgnde(EgovStringUtil.removeMinusChar(vcatnManage.getBgnde()));
		vcatnManage.setEndde(EgovStringUtil.removeMinusChar(vcatnManage.getEndde()));
		vcatnManage.setReqstDe(EgovStringUtil.removeMinusChar(vcatnManage.getReqstDe()));
		InfrmlSanctn infrmlSanctn = infrmlSanctnService.insertInfrmlSanctn(converToInfrmlSanctnObject(vcatnManage));
		// InfrmlSanctn infrmlSanctn = infrmlSanctnService.insertInfrmlSanctn("003",
		// vcatnManage);
		vcatnManage.setInfrmlSanctnId(infrmlSanctn.getInfrmlSanctnId());
		VcatnManageVO vcatnManageVO1 = selectIndvdlYrycManage(uniqId);
		double iUseYrycCo = vcatnManageVO1.getUseYrycCo(); // ?곗감?뚯씠釉붿쓽 ?ъ슜 ?곗감媛쒖닔
		double iRemndrYrycCo = vcatnManageVO1.getRemndrYrycCo(); // ?곗감?뚯씠釉붿쓽 ?붿뿬 ?곗감媛쒖닔
		double iCountYryc = 0.0;

		/*
		 * ?쒖옉?쇱옄 ? 醫낅즺?쇱옄 ?ъ씠???쇱옄 媛쒖닔 - 怨듯쑕??or 二쇰쭚 ?쒖쇅
		 */
		// ?닿?援щ텇???곗감??寃쎌슦
		if ("01".equals(vcatnManage.getVcatnSe())) {
			// ?곗감 ?닿? ?곕룄 泥댄겕
			if (!getVcatnYearSE(vcatnManage)) {
				return "09";
			}
			iCountYryc = getDateCalc(vcatnManage.getBgnde(), vcatnManage.getEndde());
			if (iCountYryc == 0) {
				return "99"; // ?곗감?ㅼ젙?ㅻ쪟
			} else if ((iRemndrYrycCo - iCountYryc) < 0) {
				return "02";
			} else {
				vcatnManageDAO.insertVcatnManage(vcatnManage);
				IndvdlYrycManage indvdlYrycManage = new IndvdlYrycManage();
				indvdlYrycManage.setUseYrycCo(iUseYrycCo + iCountYryc);
				indvdlYrycManage.setRemndrYrycCo(iRemndrYrycCo - iCountYryc);
				indvdlYrycManage.setLastUpdusrId(vcatnManage.getApplcntId());
				indvdlYrycManage.setOccrrncYear(vcatnManage.getOccrrncYear());
				indvdlYrycManage.setUsid(vcatnManage.getApplcntId());
				updtIndvdlYrycManage(indvdlYrycManage);
				return "01";
			}
		}
		// ?닿?援щ텇??諛섏감??寃쎌슦
		else if ("02".equals(vcatnManage.getVcatnSe())) {

			// ?곗감 ?닿? ?곕룄 泥댄겕
			if (!getVcatnYearSE(vcatnManage)) {
				return "09";
			}
			iCountYryc = getDateCalc(vcatnManage.getBgnde(), vcatnManage.getBgnde()); // 諛섏감???쒖옉?쇱옄 醫낅즺?쇱옄 ?숈씪?? ?쒖옉?쇱옄濡쒕쭔 泥댄겕
			if (iCountYryc == 0) {
				return "99"; // ?곗감?ㅼ젙?ㅻ쪟
			} else if ((iRemndrYrycCo - 0.5) < 0) {
				return "03";
			} else {
				vcatnManageDAO.insertVcatnManage(vcatnManage);
				IndvdlYrycManage indvdlYrycManage = new IndvdlYrycManage();
				indvdlYrycManage.setUseYrycCo(iUseYrycCo + 0.5);
				indvdlYrycManage.setRemndrYrycCo(iRemndrYrycCo - 0.5);
				indvdlYrycManage.setLastUpdusrId(vcatnManage.getApplcntId());
				indvdlYrycManage.setOccrrncYear(vcatnManage.getOccrrncYear());
				indvdlYrycManage.setUsid(vcatnManage.getApplcntId());
				updtIndvdlYrycManage(indvdlYrycManage);

				return "01";
			}
		} else {
			vcatnManageDAO.insertVcatnManage(vcatnManage);
			return "01";
		}
	}

	/**
	 * 湲??깅줉???닿?愿由ъ젙蹂대? ?섏젙?쒕떎.
	 * 
	 * @param vcatnManage - ?닿?愿由?model
	 */
	@Override
	public String updtVcatnManage(VcatnManage vcatnManage, VcatnManageVO vcatnManageVO) throws Exception {
		int iTemp = 0;
		String sTempMessage = null;
		String sTempApplcntId = vcatnManage.getApplcntId();
		String sTempVcatnSe = vcatnManage.getVcatnSe();
		String sTempBgnde = vcatnManage.getBgnde();
		String sTempEndde = vcatnManage.getEndde();

		/* ??젣泥섎━ */
		vcatnManage.setApplcntId(vcatnManageVO.getApplcntIdKey());
		vcatnManage.setVcatnSe(vcatnManageVO.getVcatnSeKey());
		vcatnManage.setBgnde(EgovStringUtil.removeMinusChar(vcatnManageVO.getBgndeKey()));
		vcatnManage.setEndde(EgovStringUtil.removeMinusChar(vcatnManageVO.getEnddeKey()));

		deleteVcatnManage(vcatnManage);
		/* ?깅줉泥섎━ */
		vcatnManage.setApplcntId(sTempApplcntId);
		vcatnManage.setVcatnSe(sTempVcatnSe);
		vcatnManage.setBgnde(EgovStringUtil.removeMinusChar(sTempBgnde));
		vcatnManage.setEndde(EgovStringUtil.removeMinusChar(sTempEndde));
		if (vcatnManage.getSanctnerId() != null) {
			vcatnManage.setConfmAt("A");
		}

		vcatnManageVO.setSearchKeyword(vcatnManage.getBgnde());
		// ?쒖옉?쇱옄 ?ы븿?щ?
		iTemp = selectVcatnManageDplctAt(vcatnManageVO);
		vcatnManageVO.setSearchKeyword(vcatnManage.getEndde());
		// 醫낅즺?쇱옄 ?ы븿?щ?
		iTemp += selectVcatnManageDplctAt(vcatnManageVO);

		if (iTemp == 0) {
			sTempMessage = insertVcatnManage(vcatnManage, vcatnManageVO);
			LOGGER.info("updtVcatnManage 4:" + sTempMessage);
			return sTempMessage;
		} else {
			sTempMessage = "10";
			LOGGER.info("updtVcatnManage 5:" + sTempMessage);
			return sTempMessage;
		}
		/*
		 * vcatnManage.setBgnde(EgovStringUtil.removeMinusChar(vcatnManage.getBgnde()));
		 * vcatnManage.setEndde(EgovStringUtil.removeMinusChar(vcatnManage.getEndde()));
		 * vcatnManage.setReqstDe(EgovStringUtil.removeMinusChar(vcatnManage.getReqstDe(
		 * ))); vcatnManageDAO.updtVcatnManage(vcatnManage);
		 * 
		 * return "01";
		 */
	}

	/**
	 * 湲??깅줉???닿?愿由ъ젙蹂대? ??젣?쒕떎.
	 * 
	 * @param vcatnManage - ?닿?愿由?model
	 */
	@Override
	@SuppressWarnings("unused")
	public void deleteVcatnManage(VcatnManage vcatnManage) throws Exception {
		/*
		 * ?닿? ?뱀씤泥섎━ ??젣 infrmlSanctnService.insertInfrmlSanctn("000", vcatnManage);
		 */
		vcatnManage.setBgnde(EgovStringUtil.removeMinusChar(vcatnManage.getBgnde()));
		vcatnManage.setEndde(EgovStringUtil.removeMinusChar(vcatnManage.getEndde()));
		vcatnManage.setReqstDe(EgovStringUtil.removeMinusChar(vcatnManage.getReqstDe()));
		infrmlSanctnService.deleteInfrmlSanctn(converToInfrmlSanctnObject(vcatnManage));

		LoginVO user = (LoginVO) EgovUserDetailsHelper.getAuthenticatedUser();

		// 媛쒖씤?곗감議고쉶
		VcatnManageVO vcatnManageVO1 = selectIndvdlYrycManage(vcatnManage.getApplcntId());
		double iUseYrycCo = vcatnManageVO1.getUseYrycCo(); // ?곗감?뚯씠釉붿쓽 ?ъ슜 ?곗감媛쒖닔
		double iRemndrYrycCo = vcatnManageVO1.getRemndrYrycCo(); // ?곗감?뚯씠釉붿쓽 ?붿뿬 ?곗감媛쒖닔
		double iCountYryc = 0.0;
		/*
		 * ?쒖옉?쇱옄 ? 醫낅즺?쇱옄 ?ъ씠???쇱옄 媛쒖닔 - 怨듯쑕??or 二쇰쭚 ?쒖쇅
		 */
		// ?닿?援щ텇???곗감??寃쎌슦
		if ("01".equals(vcatnManage.getVcatnSe())) {

			iCountYryc = getDateCalc(vcatnManage.getBgnde(), vcatnManage.getEndde());
			IndvdlYrycManage indvdlYrycManage = new IndvdlYrycManage();
			indvdlYrycManage.setUseYrycCo(iUseYrycCo - iCountYryc);
			indvdlYrycManage.setRemndrYrycCo(iRemndrYrycCo + iCountYryc);
			indvdlYrycManage.setLastUpdusrId(vcatnManage.getApplcntId());
			indvdlYrycManage.setOccrrncYear(vcatnManage.getOccrrncYear());
			indvdlYrycManage.setUsid(vcatnManage.getApplcntId());

			updtIndvdlYrycManage(indvdlYrycManage);
			vcatnManageDAO.deleteVcatnManage(vcatnManage);

		}
		// ?닿?援щ텇??諛섏감??寃쎌슦
		else if ("02".equals(vcatnManage.getVcatnSe())) {// KISA 蹂댁븞?쎌젏 議곗튂 (2018-10-29, ?ㅼ갹??

			IndvdlYrycManage indvdlYrycManage = new IndvdlYrycManage();
			indvdlYrycManage.setUseYrycCo(iUseYrycCo - 0.5);
			indvdlYrycManage.setRemndrYrycCo(iRemndrYrycCo + 0.5);
			indvdlYrycManage.setLastUpdusrId(vcatnManage.getApplcntId());
			indvdlYrycManage.setOccrrncYear(vcatnManage.getOccrrncYear());
			indvdlYrycManage.setUsid(vcatnManage.getApplcntId());
			updtIndvdlYrycManage(indvdlYrycManage);
			vcatnManageDAO.deleteVcatnManage(vcatnManage);

		} else {
			vcatnManageDAO.deleteVcatnManage(vcatnManage);
		}
	}

	/**
	 * ?닿??쇱옄 以묐났?щ? 泥댄겕
	 * 
	 * @param vcatnManageVO - ?닿?愿由?VO
	 * @return int
	 * @exception Exception
	 */
	@Override
	public int selectVcatnManageDplctAt(VcatnManageVO vcatnManageVO) throws Exception {
		return vcatnManageDAO.selectVcatnManageDplctAt(vcatnManageVO);
	}

	/*** ?뱀씤泥섎━愿??***/
	/**
	 * ?닿?愿由ъ젙蹂??뱀씤 泥섎━瑜??꾪빐 ?좎껌???닿?愿由?紐⑸줉??議고쉶?쒕떎.
	 * 
	 * @param vcatnManageVO - ?닿?愿由?VO
	 * @return List - ?닿?愿由?紐⑸줉
	 */
	@Override
	public List<VcatnManageVO> selectVcatnManageConfmList(VcatnManageVO vcatnManageVO) throws Exception {

		List<VcatnManageVO> result = vcatnManageDAO.selectVcatnManageConfmList(vcatnManageVO);
		int num = result.size();

		for (int i = 0; i < num; i++) {
			VcatnManageVO vcatnManageVO1 = result.get(i);
			vcatnManageVO1.setBgnde(EgovDateUtil.formatDate(vcatnManageVO1.getBgnde(), "-"));
			vcatnManageVO1.setEndde(EgovDateUtil.formatDate(vcatnManageVO1.getEndde(), "-"));
			result.set(i, vcatnManageVO1);
		}
		return result;
	}

	/**
	 * ?닿?愿由ъ젙蹂??뱀씤 泥섎━瑜??꾪빐 ?좎껌???닿?愿由?紐⑸줉 珥?媛쒖닔瑜?議고쉶?쒕떎.
	 * 
	 * @param vcatnManageVO - ?닿?愿由?VO
	 * @return int - ?닿?愿由?移댁슫????
	 */
	@Override
	public int selectVcatnManageConfmListTotCnt(VcatnManageVO vcatnManageVO) throws Exception {
		return vcatnManageDAO.selectVcatnManageConfmListTotCnt(vcatnManageVO);
	}

	/**
	 * ?좎껌???닿?瑜??뱀씤泥섎━?쒕떎.
	 * 
	 * @param vcatnManage - ?닿?愿由?model
	 */
	@Override
	public void updtVcatnManageConfm(VcatnManage vcatnManage) throws Exception {
		InfrmlSanctn infrmlSanctn = new InfrmlSanctn();
		vcatnManage.setBgnde(EgovStringUtil.removeMinusChar(vcatnManage.getBgnde()));
		vcatnManage.setEndde(EgovStringUtil.removeMinusChar(vcatnManage.getEndde()));
		vcatnManage.setReqstDe(EgovStringUtil.removeMinusChar(vcatnManage.getReqstDe()));

		// KISA 蹂댁븞?쎌젏 議곗튂 (2018-10-29, ?ㅼ갹??
		if ("C".equals(vcatnManage.getConfmAt())) {
			/*
			 * ?뱀씤泥섎━
			 */
			infrmlSanctn = infrmlSanctnService.updateInfrmlSanctnConfm(converToInfrmlSanctnObject(vcatnManage));

			vcatnManage.setSanctnDt(infrmlSanctn.getSanctnDt());
			vcatnManage.setConfmAt(infrmlSanctn.getConfmAt());

			vcatnManageDAO.updtVcatnManageConfm(vcatnManage);

		} else if ("R".equals(vcatnManage.getConfmAt())) {
			/*
			 * 諛섎젮泥섎━
			 */
			infrmlSanctn = infrmlSanctnService.updateInfrmlSanctnReturn(converToInfrmlSanctnObject(vcatnManage));
			vcatnManage.setSanctnDt(infrmlSanctn.getSanctnDt());
			vcatnManage.setConfmAt(infrmlSanctn.getConfmAt());

			// ?곗감 諛섑솚泥섎━
			// 媛쒖씤?곗감議고쉶
			VcatnManageVO vcatnManageVO1 = selectIndvdlYrycManage(vcatnManage.getApplcntId());
			double iUseYrycCo = vcatnManageVO1.getUseYrycCo(); // ?곗감?뚯씠釉붿쓽 ?ъ슜 ?곗감媛쒖닔
			double iRemndrYrycCo = vcatnManageVO1.getRemndrYrycCo(); // ?곗감?뚯씠釉붿쓽 ?붿뿬 ?곗감媛쒖닔
			double iCountYryc = 0.0;

			/*
			 * ?쒖옉?쇱옄 ? 醫낅즺?쇱옄 ?ъ씠???쇱옄 媛쒖닔 - 怨듯쑕??or 二쇰쭚 ?쒖쇅
			 */
			// ?닿?援щ텇???곗감??寃쎌슦
			if ("01".equals(vcatnManage.getVcatnSe())) {

				iCountYryc = getDateCalc(vcatnManage.getBgnde(), vcatnManage.getEndde());

				IndvdlYrycManage indvdlYrycManage = new IndvdlYrycManage();
				indvdlYrycManage.setUseYrycCo(iUseYrycCo - iCountYryc);
				indvdlYrycManage.setRemndrYrycCo(iRemndrYrycCo + iCountYryc);
				indvdlYrycManage.setLastUpdusrId(vcatnManage.getApplcntId());
				indvdlYrycManage.setOccrrncYear(vcatnManage.getOccrrncYear());
				indvdlYrycManage.setUsid(vcatnManage.getApplcntId());

				updtIndvdlYrycManage(indvdlYrycManage);
			}
			// ?닿?援щ텇??諛섏감??寃쎌슦
			else if ("02".equals(vcatnManage.getVcatnSe())) {

				IndvdlYrycManage indvdlYrycManage = new IndvdlYrycManage();
				indvdlYrycManage.setUseYrycCo(iUseYrycCo - 0.5);
				indvdlYrycManage.setRemndrYrycCo(iRemndrYrycCo + 0.5);
				indvdlYrycManage.setLastUpdusrId(vcatnManage.getApplcntId());
				indvdlYrycManage.setOccrrncYear(vcatnManage.getOccrrncYear());
				indvdlYrycManage.setUsid(vcatnManage.getApplcntId());
				updtIndvdlYrycManage(indvdlYrycManage);
			}
			vcatnManageDAO.updtVcatnManageConfm(vcatnManage);
		}
	}

	/*** ?곗감愿??***/
	/**
	 * 媛쒖씤蹂??곗감愿由ъ쓽 ?곸꽭?뺣낫瑜?議고쉶?쒕떎.
	 * 
	 * @param vcatnManageVO - ?닿?愿由?VO
	 * @return VcatnManageVO - ?닿?愿由?VO
	 */
	@Override
	public VcatnManageVO selectIndvdlYrycManage(String sUsid) throws Exception {

		VcatnManageVO vcatnManageVO = new VcatnManageVO();
		java.util.Calendar cal = java.util.Calendar.getInstance();
		String sYear = Integer.toString(cal.get(java.util.Calendar.YEAR));

		vcatnManageVO.setOccrrncYear(sYear);
		vcatnManageVO.setUsid(sUsid);

		return vcatnManageDAO.selectIndvdlYrycManage(vcatnManageVO);
	}

	/**
	 * 媛쒖씤蹂??곗감瑜??섏젙 泥섎━?쒕떎.
	 * 
	 * @param vcatnManage - ?닿?愿由?model
	 */
	@Override
	public void updtIndvdlYrycManage(IndvdlYrycManage indvdlYrycManage) throws Exception {
		vcatnManageDAO.updtIndvdlYrycManage(indvdlYrycManage);
	}

	/****** ?쇱닔 怨꾩궛 ******/
	/**
	 * ?대떦?쇱옄???좎쭨?ъ씠 ?쇱닔瑜?援ы븳??
	 * 
	 * @param String fromDay, String toDay
	 * @return double
	 * @exception Exception
	 */
	private double getDateCalc(String fromDay, String toDay) throws Exception {

		// ?쒖옉?쇱옄
		int fromYear = Integer.parseInt(fromDay.substring(0, 4));
		int fromMonth = Integer.parseInt(fromDay.substring(4, 6)) - 1;
		int fromDate = Integer.parseInt(fromDay.substring(6, 8));
		// 醫낅즺?쇱옄
		int toYear = Integer.parseInt(toDay.substring(0, 4));
		int toMonth = Integer.parseInt(toDay.substring(4, 6)) - 1;
		int toDate = Integer.parseInt(toDay.substring(6, 8));

		Calendar startDay = Calendar.getInstance();
		startDay.set(fromYear, fromMonth, fromDate);

		Calendar endDay = Calendar.getInstance();
		endDay.set(toYear, toMonth, toDate);

		double count = 0.0;

		// ?쒖옉?쇱옄 遺??醫낅즺?쇱옄源뚯? while
		while (!startDay.after(endDay)) {
			// ?좎슂?? ?쇱슂?쇱? ?쇱닔 count?먯꽌 ?쒖쇅
			if (startDay.get(Calendar.DAY_OF_WEEK) != 1 && startDay.get(Calendar.DAY_OF_WEEK) != 7) {
				count++;
			}
			startDay.add(Calendar.DATE, 1);
		}

		return count;
	}

	/**
	 * ?닿??쇱옄 ?대떦?곗감諛쒖깮?곕룄???랁븯?붿? ?щ? 泥댄겕
	 * 
	 * @param VcatnManage vcatnManage
	 * @return boolean
	 * @exception Exception
	 */
	private boolean getVcatnYearSE(VcatnManage vcatnManage) throws Exception {

		boolean bRetrunValue = false;
		java.util.Calendar cal = java.util.Calendar.getInstance();

		int iYear = cal.get(java.util.Calendar.YEAR);
		// ?쒖옉?쇱옄
		int iYearBgnVcatn = Integer.parseInt(vcatnManage.getBgnde().substring(0, 4));
		// 醫낅즺?쇱옄
		int iYearEndVcatn = Integer.parseInt(vcatnManage.getEndde().substring(0, 4));
		if (iYear == iYearBgnVcatn && iYear == iYearEndVcatn) {
			bRetrunValue = true;
		}
		return bRetrunValue;
	}

	/**
	 * VcatnManage model??InfrmlSanctn model濡?蹂?섑븳??
	 * 
	 * @param VcatnManage
	 * @return InfrmlSanctn
	 * @param vcatnManage
	 */
	private InfrmlSanctn converToInfrmlSanctnObject(VcatnManage vcatnManage) throws Exception {
		InfrmlSanctn infrmlSanctn = new InfrmlSanctn();
		infrmlSanctn.setJobSeCode("003"); // ?낅Т援щ텇肄붾뱶 (怨듯넻肄붾뱶 COM75)
		infrmlSanctn.setApplcntId(vcatnManage.getApplcntId()); // ?좎껌?륤D
		infrmlSanctn.setReqstDe(vcatnManage.getReqstDe()); // ?좎껌?쇱옄
		infrmlSanctn.setSanctnerId(vcatnManage.getSanctnerId()); // 寃곗옱?륤D
		infrmlSanctn.setConfmAt(vcatnManage.getConfmAt()); // ?뱀씤援щ텇
		infrmlSanctn.setSanctnDt(vcatnManage.getSanctnDt()); // 寃곗옱?쇱떆
		infrmlSanctn.setReturnResn(vcatnManage.getReturnResn()); // 諛섎젮?ъ쑀
		infrmlSanctn.setFrstRegisterId(vcatnManage.getFrstRegisterId());
		infrmlSanctn.setFrstRegisterPnttm(vcatnManage.getFrstRegisterId());
		infrmlSanctn.setLastUpdusrId(vcatnManage.getLastUpdusrId());
		infrmlSanctn.setLastUpdusrPnttm(vcatnManage.getLastUpdusrPnttm());
		infrmlSanctn.setInfrmlSanctnId(vcatnManage.getInfrmlSanctnId());// ?쎌떇寃곗옱ID
		return infrmlSanctn;
	}

}
