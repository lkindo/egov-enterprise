package egovframework.com.cop.smt.lsm.service.impl;

import java.text.SimpleDateFormat;
import java.util.Calendar;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.egovframe.rte.fdl.idgnr.EgovIdGnrService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import egovframework.com.cop.smt.lsm.service.EgovLeaderSchdulService;
import egovframework.com.cop.smt.lsm.service.EmplyrVO;
import egovframework.com.cop.smt.lsm.service.LeaderSchdul;
import egovframework.com.cop.smt.lsm.service.LeaderSchdulVO;
import egovframework.com.cop.smt.lsm.service.LeaderSttus;
import egovframework.com.cop.smt.lsm.service.LeaderSttusVO;
import jakarta.annotation.Resource;

/**
 * <pre>
 * 媛쒖슂
 * - 媛꾨??쇱젙?????ServiceImpl ?대옒?ㅻ? ?뺤쓽?쒕떎.
 * 
 * ?곸꽭?댁슜
 * - 媛꾨??쇱젙??????깅줉, ?섏젙, ??젣, 議고쉶湲곕뒫???쒓났?쒕떎.
 * - 媛꾨??쇱젙??議고쉶湲곕뒫? 紐⑸줉議고쉶, ?곸꽭議고쉶濡?援щ텇?쒕떎.
 * </pre>
 * 
 * @author ?μ쿋??
 * @since 28-6-2010 ?ㅼ쟾 10:59:05
 * @version 1.0
 * @see
 * 
 *      <pre>
 *  == 媛쒖젙?대젰(Modification Information) ==
 *
 *   ?섏젙??     ?섏젙??          ?섏젙?댁슜
 *  -------    --------    ---------------------------
 *   2024.10.29  ?대갚??         @Override ?쒓린, 遺덊븘???뺣????쒓굅
 *   2025.06.11  ?대갚??         PMD濡??뚰봽?몄썾??蹂댁븞?쎌젏 吏꾨떒?섍퀬 ?쒓굅?섍린-UnnecessaryBoxing(遺덊븘?뷀븳 諛뺤떛), SimpleDateFormatNeedsLocale(媛꾨떒???좎쭨 ?뺤떇??濡쒖??쇱씠 ?꾩슂?⑸땲??)
 *
 *      </pre>
 */
@Service("EgovLeaderSchdulService")
public class EgovLeaderSchdulServiceImpl extends EgovAbstractServiceImpl implements EgovLeaderSchdulService {

	@Resource(name = "LeaderSchdulDAO")
	private LeaderSchdulDAO leaderSchdulDAO;

	@Resource(name = "egovLeaderSchdulIdGnrService")
	private EgovIdGnrService idgenService;

	private static final Logger LOGGER = LoggerFactory.getLogger(EgovLeaderSchdulServiceImpl.class);

	/**
	 * ?ъ슜??紐⑸줉??議고쉶?쒕떎.
	 * 
	 * @param EmplyrVO
	 * @return Map<String, Object>
	 * 
	 * @param emplyrVO
	 */
	@Override
	public Map<String, Object> selectEmplyrList(EmplyrVO emplyrVO) throws Exception {
		List<EmplyrVO> result = leaderSchdulDAO.selectEmplyrList(emplyrVO);
		int cnt = leaderSchdulDAO.selectEmplyrListCnt(emplyrVO);

		Map<String, Object> map = new HashMap<>();

		map.put("resultList", result);
		map.put("resultCnt", Integer.toString(cnt));

		return map;
	}

	/**
	 * ?붾퀎 媛꾨??쇱젙 紐⑸줉??議고쉶?쒕떎.
	 * 
	 * @param LeaderSchdulVO
	 * @return List
	 * 
	 * @param leaderSchdulVo
	 */
	@Override
	public List<LeaderSchdulVO> selectLeaderSchdulList(LeaderSchdulVO leaderSchdulVo) throws Exception {
		return leaderSchdulDAO.selectLeaderSchdulList(leaderSchdulVo);
	}

	/**
	 * 媛꾨??쇱젙 ?뺣낫瑜?議고쉶?쒕떎.
	 * 
	 * @param LeaderSchdulVO
	 * @return LeaderSchdulVO
	 * 
	 * @param leaderSchdulVO
	 */
	@Override
	public LeaderSchdulVO selectLeaderSchdul(LeaderSchdulVO leaderSchdulVO) throws Exception {
		return leaderSchdulDAO.selectLeaderSchdul(leaderSchdulVO);
	}

	/**
	 * 媛꾨??쇱젙 ?뺣낫瑜??섏젙?쒕떎.
	 * 
	 * @param LeaderSchdul
	 * 
	 * @param leaderSchdul
	 */
	@Override
	public void updateLeaderSchdul(LeaderSchdul leaderSchdul) throws Exception {
		leaderSchdulDAO.updateLeaderSchdul(leaderSchdul);
		leaderSchdulDAO.deleteLeaderSchdulDe(leaderSchdul);

		insertLeaderSchdulDe(leaderSchdul);
	}

	/**
	 * 媛꾨??쇱젙 ?뺣낫瑜??깅줉?쒕떎.
	 * 
	 * @param LeaderSchdul
	 * 
	 * @param leaderSchdul
	 */
	@Override
	public void insertLeaderSchdul(LeaderSchdul leaderSchdul) throws Exception {
		String schdulID = idgenService.getNextStringId();
		leaderSchdul.setSchdulId(schdulID);

		leaderSchdulDAO.insertLeaderSchdul(leaderSchdul);

		insertLeaderSchdulDe(leaderSchdul);
	}

	/**
	 * 媛꾨??쇱젙?쇱옄 ?뺣낫瑜??깅줉?쒕떎.
	 * 
	 * @param LeaderSchdul
	 * 
	 * @param leaderSchdul
	 */
	private void insertLeaderSchdulDe(LeaderSchdul leaderSchdul) throws Exception {
		leaderSchdul.setSchdulDe(leaderSchdul.getSchdulBgndeYYYMMDD().replaceAll("-", ""));
		// SCHEDUL_DE ?ㅼ젙
		if (leaderSchdul.getSchdulBgndeYYYMMDD().equals(leaderSchdul.getSchdulEnddeYYYMMDD())
				|| "1".equals(leaderSchdul.getReptitSeCode())) {
			leaderSchdulDAO.insertLeaderSchdulDe(leaderSchdul);
		} else {
			String sBgnDe = leaderSchdul.getSchdulBgndeYYYMMDD().replaceAll("-", "");
			String sEndDe = leaderSchdul.getSchdulEnddeYYYMMDD().replaceAll("-", "");
			int iBgnDe = Integer.parseInt(sBgnDe);
			int iEndDe = Integer.parseInt(sEndDe);

			int iNowDe = iBgnDe;
			int iNowYear = 0;
			int iNowMonth = 0;
			int iNowDay = 0;
			int iEndDay = 0;

			String sNowYear = "";
			String sNowMonth = "";
			String sNowDay = "";

			java.util.Calendar cal = java.util.Calendar.getInstance();
			// KISA 蹂댁븞?쎌젏 議곗튂 (2018-10-29, ?ㅼ갹??
			LeaderSchdul leaderSchdulDe = null;
			if ("2".equals(leaderSchdul.getReptitSeCode()) || "3".equals(leaderSchdul.getReptitSeCode())
					|| "4".equals(leaderSchdul.getReptitSeCode())) {
				while (true) {
					LOGGER.info("[jino]#######################");
					LOGGER.info("[jino] [1-1] iNowDe ==> " + iNowDe);
					LOGGER.info("[jino] [1-1] iBgnDe ==> " + iBgnDe);
					LOGGER.info("[jino]#######################");
					if (iNowDe != iBgnDe) {
						iNowYear = Integer.parseInt(String.valueOf(iNowDe).substring(0, 4));
						iNowMonth = Integer.parseInt(String.valueOf(iNowDe).substring(4, 6));
						iNowDay = Integer.parseInt(String.valueOf(iNowDe).substring(6, 8));

						if ("2".equals(leaderSchdul.getReptitSeCode()) || "3".equals(leaderSchdul.getReptitSeCode())) {
							cal.set(iNowYear, iNowMonth - 1, 1);
							iEndDay = cal.getActualMaximum(Calendar.DAY_OF_MONTH);

							if (iEndDay < iNowDay) {
								iNowMonth = iNowMonth + 1;
								iNowDay = 1;
								if (iNowMonth > 12) {
									iNowMonth = 1;
									iNowYear = iNowYear + 1;
								}
							}
						} else {
							if (iNowMonth > 12) {
								iNowMonth = 1;
								iNowYear = iNowYear + 1;
							}
						}

						sNowYear = String.valueOf(iNowYear);
						sNowMonth = String.valueOf(iNowMonth);
						sNowDay = String.valueOf(iNowDay);

						if (sNowMonth.length() == 1) {
							sNowMonth = "0" + sNowMonth;
						}
						if (sNowDay.length() == 1) {
							sNowDay = "0" + sNowDay;
						}

						iNowDe = Integer.parseInt(sNowYear + sNowMonth + sNowDay);
					}

					if (iNowDe > iEndDe) {
						break;
					}

					leaderSchdulDe = new LeaderSchdul();
					leaderSchdulDe.setSchdulId(leaderSchdul.getSchdulId());
					leaderSchdulDe.setSchdulDe(String.valueOf(iNowDe));

					leaderSchdulDAO.insertLeaderSchdulDe(leaderSchdulDe);

					if ("2".equals(leaderSchdul.getReptitSeCode())) {
						iNowDe = iNowDe + 1;
					} else if ("3".equals(leaderSchdul.getReptitSeCode())) {
						int year = Integer.parseInt(String.valueOf(iNowDe).substring(0, 4));
						int month = Integer.parseInt(String.valueOf(iNowDe).substring(4, 6));
						int day = Integer.parseInt(String.valueOf(iNowDe).substring(6, 8));
						java.util.Calendar calendar = java.util.Calendar.getInstance();
						calendar.set(year, month - 1, day);
						calendar.add(Calendar.DAY_OF_YEAR, 7);
						SimpleDateFormat fm = new SimpleDateFormat("yyyyMMdd"); // NOPMD - SimpleDateFormatNeedsLocale
						iNowDe = Integer.parseInt(fm.format(calendar.getTime()));
					} else if ("4".equals(leaderSchdul.getReptitSeCode())) {
						iNowDe = iNowDe + 100;
					}
				}
			}
		}
	}

	/**
	 * 媛꾨??쇱젙 ?뺣낫瑜???젣?쒕떎.
	 * 
	 * @param LeaderSchdul
	 * 
	 * @param leaderSchdul
	 */
	@Override
	public void deleteLeaderSchdul(LeaderSchdul leaderSchdul) throws Exception {
		leaderSchdulDAO.deleteLeaderSchdulDe(leaderSchdul);
		leaderSchdulDAO.deleteLeaderSchdul(leaderSchdul);
	}

	/**
	 * 媛꾨??곹깭 紐⑸줉??議고쉶?쒕떎.
	 * 
	 * @param LeaderSttusVO - 媛꾨??곹깭 VO
	 * @return Map<String, Object>
	 * 
	 * @param leaderSttusVO
	 */
	@Override
	public Map<String, Object> selectLeaderSttusList(LeaderSttusVO leaderSttusVO) throws Exception {
		List<LeaderSttusVO> result = leaderSchdulDAO.selectLeaderSttusList(leaderSttusVO);
		int cnt = leaderSchdulDAO.selectLeaderSttusListCnt(leaderSttusVO);

		Map<String, Object> map = new HashMap<String, Object>();

		map.put("resultList", result);
		map.put("resultCnt", Integer.toString(cnt));

		return map;
	}

	/**
	 * 媛꾨??곹깭 ?뺣낫瑜?議고쉶?쒕떎.
	 * 
	 * @param LeaderSttusVO - 媛꾨??곹깭 VO
	 * @return LeaderSttusVO - 媛꾨??곹깭 VO
	 * 
	 * @param leaderSttusVO
	 */
	@Override
	public LeaderSttusVO selectLeaderSttus(LeaderSttusVO leaderSttusVO) throws Exception {
		return leaderSchdulDAO.selectLeaderSttus(leaderSttusVO);
	}

	/**
	 * 媛꾨??곹깭 ?뺣낫瑜??섏젙?쒕떎.
	 * 
	 * @param LeaderSttus - 媛꾨??곹깭 model
	 * 
	 * @param leaderSttus
	 */
	@Override
	public void updateLeaderSttus(LeaderSttus leaderSttus) throws Exception {
		leaderSchdulDAO.updateLeaderSttus(leaderSttus);
	}

	/**
	 * 媛꾨??곹깭 ?뺣낫瑜??깅줉?쒕떎.
	 * 
	 * @param LeaderSttus - 媛꾨??곹깭 model
	 * 
	 * @param leaderSttus
	 */
	@Override
	public void insertLeaderSttus(LeaderSttus leaderSttus) throws Exception {
		leaderSchdulDAO.insertLeaderSttus(leaderSttus);
	}

	/**
	 * 媛꾨??곹깭瑜??깅줉?섍린 ?꾪븳 以묐났 議고쉶瑜??섑뻾?쒕떎.
	 * 
	 * @param LeaderSttus - 媛꾨??곹깭 model
	 * @return int
	 * 
	 * @param leaderSttus
	 */
	@Override
	public int selectLeaderSttusCheck(LeaderSttus leaderSttus) throws Exception {
		return leaderSchdulDAO.selectLeaderSttusCheck(leaderSttus);
	}

	/**
	 * 媛꾨??곹깭 ?뺣낫瑜???젣?쒕떎.
	 * 
	 * @param LeaderSttus - 媛꾨??곹깭 model
	 * 
	 * @param leaderSttus
	 */
	@Override
	public void deleteLeaderSttus(LeaderSttus leaderSttus) throws Exception {
		leaderSchdulDAO.deleteLeaderSttus(leaderSttus);
	}

}