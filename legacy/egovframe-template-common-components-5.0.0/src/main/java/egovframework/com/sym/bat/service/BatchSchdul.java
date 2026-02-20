package egovframework.com.sym.bat.service;

import java.io.Serializable;
import java.util.List;

import egovframework.com.cmm.ComDefaultVO;

/**
 * 諛곗튂?ㅼ?以꾧?由ъ뿉 ???model ?대옒??
 *
 * @author 源吏꾨쭔
 * @since 2010.06.17
 * @version 1.0
 * @updated 17-6-2010 ?ㅼ쟾 10:27:13
 * @see
 * <pre>
 * == 媛쒖젙?대젰(Modification Information) ==
 *
 *   ?섏젙??      ?섏젙??          ?섏젙?댁슜
 *  -------     --------    ---------------------------
 *  2010.06.17   源吏꾨쭔     理쒖큹 ?앹꽦
 * </pre>
 */
@SuppressWarnings("serial")
public class BatchSchdul extends ComDefaultVO implements Serializable {

	/**
	 * 諛곗튂?ㅼ?以껱D
	 */
	private String batchSchdulId;

	/**
	 * 諛곗튂?묒뾽ID
	 */
	private String batchOpertId;

	/**
	 * ?ㅽ뻾二쇨린
	 */
	private String executCycle;
	/**
	 * ?ㅽ뻾?ㅼ?以꾩씪??
	 */
	private String executSchdulDe;
	/**
	 * ?ㅽ뻾?ㅼ?以꾩떆
	 */
	private String executSchdulHour;
	/**
	 * ?ㅽ뻾?ㅼ?以꾨텇
	 */
	private String executSchdulMnt;
	/**
	 * ?ㅽ뻾?ㅼ?以꾩큹
	 */
	private String executSchdulSecnd;
	/**
	 * ?ㅽ뻾?ㅼ?以꾩슂??
	 */
	private String[] executSchdulDfkSes;

	/**
	 * 理쒖쥌?섏젙???꾩씠??
	 */
	private String lastUpdusrId;
	/**
	 * 理쒖쥌?섏젙?쒖젏
	 */
	private String lastUpdusrPnttm;
	/**
	 * 理쒖큹?깅줉???꾩씠??
	 */
	private String frstRegisterId;
	/**
	 * 理쒖큹?깅줉?쒖젏
	 */
	private String frstRegisterPnttm;

	/**
	 * 諛곗튂?묒뾽紐?
	 */
	private String batchOpertNm;
	/**
	 * 諛곗튂?꾨줈洹몃옩
	 */
	private String batchProgrm;
	/**
	 * ?뚮씪誘명꽣
	 */
	private String paramtr;
	/**
	 * ?ㅽ뻾二쇨린紐?
	 */
	private String executCycleNm;
	/**
	 * ?ㅽ뻾?ㅼ?以?
	 */
	private String executSchdul;

	/**
	 * @return the batchSchdulId
	 */
	public String getBatchSchdulId() {
		return batchSchdulId;
	}

	/**
	 * @return the batchOpertId
	 */
	public String getBatchOpertId() {
		return batchOpertId;
	}

	/**
	 * @return the executCycle
	 */
	public String getExecutCycle() {
		return executCycle;
	}

	/**
	 * @return the executSchdulDe
	 */
	public String getExecutSchdulDe() {
		return executSchdulDe;
	}

	/**
	 * @return the executSchdulHour
	 */
	public String getExecutSchdulHour() {
		return executSchdulHour;
	}

	/**
	 * @return the executSchdulMnt
	 */
	public String getExecutSchdulMnt() {
		return executSchdulMnt;
	}

	/**
	 * @return the executSchdulSecnd
	 */
	public String getExecutSchdulSecnd() {
		return executSchdulSecnd;
	}

	/**
	 * @return the executSchdulDfkSes
	 */
	public String[] getExecutSchdulDfkSes() {
		//return executSchdulDfkSes;
		String[] ret = null;
		if (this.executSchdulDfkSes != null) {
			ret = new String[executSchdulDfkSes.length];
			for (int i = 0; i < executSchdulDfkSes.length; i++) {
				ret[i] = this.executSchdulDfkSes[i];
			}
		}

		return ret;
	}

	/**
	 * @return the lastUpdusrId
	 */
	public String getLastUpdusrId() {
		return lastUpdusrId;
	}

	/**
	 * @return the lastUpdusrPnttm
	 */
	public String getLastUpdusrPnttm() {
		return lastUpdusrPnttm;
	}

	/**
	 * @return the frstRegisterId
	 */
	public String getFrstRegisterId() {
		return frstRegisterId;
	}

	/**
	 * @return the frstRegisterPnttm
	 */
	public String getFrstRegisterPnttm() {
		return frstRegisterPnttm;
	}

	/**
	 * @return the batchOpertNm
	 */
	public String getBatchOpertNm() {
		return batchOpertNm;
	}

	/**
	 * @return the batchProgrm
	 */
	public String getBatchProgrm() {
		return batchProgrm;
	}

	/**
	 * @return the executCycleNm
	 */
	public String getExecutCycleNm() {
		return executCycleNm;
	}

	/**
	 * @param batchSchdulId the batchSchdulId to set
	 */
	public void setBatchSchdulId(String batchSchdulId) {
		this.batchSchdulId = batchSchdulId;
	}

	/**
	 * @param batchOpertId the batchOpertId to set
	 */
	public void setBatchOpertId(String batchOpertId) {
		this.batchOpertId = batchOpertId;
	}

	/**
	 * @param executCycle the executCycle to set
	 */
	public void setExecutCycle(String executCycle) {
		this.executCycle = executCycle;
	}

	/**
	 * @param executSchdulDe the executSchdulDe to set
	 */
	public void setExecutSchdulDe(String executSchdulDe) {
		this.executSchdulDe = executSchdulDe;
	}

	/**
	 * @param executSchdulHour the executSchdulHour to set
	 */
	public void setExecutSchdulHour(String executSchdulHour) {
		this.executSchdulHour = executSchdulHour;
	}

	/**
	 * @param executSchdulMnt the executSchdulMnt to set
	 */
	public void setExecutSchdulMnt(String executSchdulMnt) {
		this.executSchdulMnt = executSchdulMnt;
	}

	/**
	 * @param executSchdulSecnd the executSchdulSecnd to set
	 */
	public void setExecutSchdulSecnd(String executSchdulSecnd) {
		this.executSchdulSecnd = executSchdulSecnd;
	}

	/**
	 * @param executSchdulDfkSes the executSchdulDfkSes to set
	 */
	public void setExecutSchdulDfkSes(String[] executSchdulDfkSes) {
		//this.executSchdulDfkSes = executSchdulDfkSes;
		this.executSchdulDfkSes = new String[executSchdulDfkSes.length];
		for (int i = 0; i < executSchdulDfkSes.length; ++i) {
			this.executSchdulDfkSes[i] = executSchdulDfkSes[i];
		}
	}

	/**
	 * @param lastUpdusrId the lastUpdusrId to set
	 */
	public void setLastUpdusrId(String lastUpdusrId) {
		this.lastUpdusrId = lastUpdusrId;
	}

	/**
	 * @param lastUpdusrPnttm the lastUpdusrPnttm to set
	 */
	public void setLastUpdusrPnttm(String lastUpdusrPnttm) {
		this.lastUpdusrPnttm = lastUpdusrPnttm;
	}

	/**
	 * @param frstRegisterId the frstRegisterId to set
	 */
	public void setFrstRegisterId(String frstRegisterId) {
		this.frstRegisterId = frstRegisterId;
	}

	/**
	 * @param frstRegisterPnttm the frstRegisterPnttm to set
	 */
	public void setFrstRegisterPnttm(String frstRegisterPnttm) {
		this.frstRegisterPnttm = frstRegisterPnttm;
	}

	/**
	 * @param batchOpertNm the batchOpertNm to set
	 */
	public void setBatchOpertNm(String batchOpertNm) {
		this.batchOpertNm = batchOpertNm;
	}

	/**
	 * @param batchProgrm the batchProgrm to set
	 */
	public void setBatchProgrm(String batchProgrm) {
		this.batchProgrm = batchProgrm;
	}

	/**
	 * @param executCycleNm the executCycleNm to set
	 */
	public void setExecutCycleNm(String executCycleNm) {
		this.executCycleNm = executCycleNm;
	}

	/**
	 * @return the executSchdul
	 */
	public String getExecutSchdul() {
		return executSchdul;
	}

	/**
	 * @param executSchdul the executSchdul to set
	 */
	public void setExecutSchdul(String executSchdul) {
		this.executSchdul = executSchdul;
	}

	/**
	 * 由ъ뒪?? ?곸꽭?붾㈃ ?붾㈃?쒖떆???ㅽ뻾?ㅼ?以꾩냽?깆쓣 留뚮뱾??executSchdul ?꾨뱶????ν븳??
	 *
	 * @param dfkSeList List<BatchSchdulDfk>?뺤쓽 ?붿씪援щ텇肄붾뱶?뺣낫由ъ뒪??
	 */
	public void makeExecutSchdul(List<BatchSchdulDfk> dfkSeList) {
		String executSchdul = "";
		String executSchdulDeNm = "";

		// ?좎쭨 異쒕젰
		if (this.executCycle.equals("02") || this.executCycle.equals("01")) {
			// 留ㅼ＜, 留ㅼ씪??寃쎌슦???ㅼ?以꾩씪?먮? ?ъ슜?섏? ?딅뒗??
			executSchdulDeNm = "";
		} else if (this.executCycle.equals("03")) {
			// 留ㅼ썡 泥섎━
			if (!"".equals(this.executSchdulDe)) {
				executSchdulDeNm = executSchdulDeNm + this.executSchdulDe.substring(6, 8) + "??";
			}
		} else if (this.executCycle.equals("04")) {
			// 留ㅻ뀈?섍꼍??泥섎━
			if (!"".equals(this.executSchdulDe)) {
				executSchdulDeNm = executSchdulDeNm + this.executSchdulDe.substring(4, 6) + "-" + this.executSchdulDe.substring(6, 8) + " ";
			}
		} else {
			// ?댁쇅?섍꼍??泥섎━
			if (!"".equals(this.executSchdulDe)) {
				executSchdulDeNm = executSchdulDeNm + this.executSchdulDe.substring(0, 4) + "-" + this.executSchdulDe.substring(4, 6) + "-" + this.executSchdulDe.substring(6, 8)
						+ " ";
			}
		}

		// ?좎쭨 異쒕젰
		executSchdul = executSchdul + executSchdulDeNm;

		// ?붿씪異쒕젰
		if (this.executCycle.equals("02")) {
			// ?ㅽ뻾二쇨린媛 留ㅼ＜??寃쎌슦?먮쭔 異쒕젰?쒕떎.
			if (dfkSeList.size() != 0) {
				for (int i = 0; i < dfkSeList.size(); i++) {
					if (i != 0) {
						executSchdul = executSchdul + ",";
					}
					executSchdul = executSchdul + dfkSeList.get(i).getExecutSchdulDfkSeNm();
				}
				executSchdul = executSchdul + " ";
			}
		}

		// ?? 遺? 珥?異쒕젰
		// ?쒕텇珥덈뒗 ??긽異쒕젰?쒕떎.
		executSchdul = executSchdul + this.executSchdulHour + ":" + this.executSchdulMnt + ":" + this.executSchdulSecnd;

		// 媛믪???
		this.executSchdul = executSchdul;

	}

	/**
	 * ?ㅽ뻾?ㅼ?以꾩쓣 CronExpression?쇰줈 諛붽퓭??由ы꽩?쒕떎.
	 **/
	public String toCronExpression() {
		String cronExpression = "";

		// 珥덈???
		cronExpression = cronExpression + this.executSchdulSecnd;

		// 遺꾨???
		cronExpression = cronExpression + " " + this.executSchdulMnt;

		// ?쒕???
		cronExpression = cronExpression + " " + this.executSchdulHour;

		// ?쇰???
		if (this.executCycle.equals("01")) {
			// 留ㅼ씪?멸꼍??"*" 異쒕젰
			cronExpression = cronExpression + " " + "*";
		} else if (this.executCycle.equals("02")) {
			// 留ㅼ＜??寃쎌슦 "?" 異쒕젰
			cronExpression = cronExpression + " " + "?";
		} else {
			// ?댁쇅??寃쎌슦 洹몃?濡?異쒕젰
			cronExpression = cronExpression + " " + this.executSchdulDe.substring(6, 8);
		}

		// ?붾???
		if (this.executCycle.equals("01") || this.executCycle.equals("02") || this.executCycle.equals("03")) {
			// 留ㅼ씪,留ㅼ썡,留ㅼ＜?멸꼍??"*" 異쒕젰
			cronExpression = cronExpression + " " + "*";
		} else {
			// ?댁쇅??寃쎌슦 洹몃?濡?異쒕젰
			cronExpression = cronExpression + " " + this.executSchdulDe.substring(4, 6);
		}

		// 二?蹂??
		if (this.executCycle.equals("02")) {
			// 留ㅼ＜?멸꼍??day of week瑜? 異쒕젰
			String dayOfWeek = "";
			for (int i = 0; i < this.executSchdulDfkSes.length; i++) {
				if (i != 0) {
					dayOfWeek = dayOfWeek + ",";
				}
				dayOfWeek = dayOfWeek + this.executSchdulDfkSes[i];
			}
			cronExpression = cronExpression + " " + dayOfWeek;
		} else {
			// ?댁쇅??寃쎌슦 "?" 異쒕젰
			cronExpression = cronExpression + " " + "?";
		}

		// ?꾨???
		if (this.executCycle.equals("05")) {
			// ?쒕쾲留뚯씤寃쎌슦 ?곕룄 異쒕젰
			cronExpression = cronExpression + " " + this.executSchdulDe.substring(0, 4);
		}
		return cronExpression;

	}

	/**
	 * @return the paramtr
	 */
	public String getParamtr() {
		return paramtr;
	}

	/**
	 * @param paramtr the paramtr to set
	 */
	public void setParamtr(String paramtr) {
		this.paramtr = paramtr;
	}

}