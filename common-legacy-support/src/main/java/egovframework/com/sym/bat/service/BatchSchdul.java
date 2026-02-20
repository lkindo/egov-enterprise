package egovframework.com.sym.bat.service;

import java.util.List;

import egovframework.com.cmm.ComDefaultVO;

/**
 * ?????? ????model ?????
 *
 * @author ?
 * @since 2010.06.17
 * @version 1.0
 * @updated 17-6-2010 ?? 10:27:13
 * @see
 * 
 *      <pre>
 * == ?????Modification Information) ==
 *
 *   ????      ????          ????
 *  -------     --------    ---------------------------
 *  2010.06.17   ?    ????
 *      </pre>
 **/
public class BatchSchdul extends ComDefaultVO {

	private static final long serialVersionUID = 1L;

	/**
	 * ????D
	 **/
	private String batchSchdulId;

	/**
	 * ??ID
	 **/
	private String batchOpertId;

	/**
	 * ???
	 **/
	private String executCycle;
	/**
	 * ????????
	 **/
	private String executSchdulDe;
	/**
	 * ???????
	 **/
	private String executSchdulHour;
	/**
	 * ???????
	 **/
	private String executSchdulMnt;
	/**
	 * ???????
	 **/
	private String executSchdulSecnd;
	/**
	 * ????????
	 **/
	private String[] executSchdulDfkSes;

	/**
	 * ???????
	 **/
	private String lastUpdusrId;
	/**
	 * ????
	 **/
	private String lastUpdusrPnttm;
	/**
	 * ???????
	 **/
	private String frstRegisterId;
	/**
	 * ????
	 **/
	private String frstRegisterPnttm;

	/**
	 * ???
	 **/
	private String batchOpertNm;
	/**
	 * ????
	 **/
	private String batchProgrm;
	/**
	 * ????
	 **/
	private String paramtr;
	/**
	 * ???
	 **/
	private String executCycleNm;
	/**
	 * ??????
	 **/
	private String executSchdul;

	/**
	 * @return the batchSchdulId
	 **/
	public String getBatchSchdulId() {
		return batchSchdulId;
	}

	/**
	 * @return the batchOpertId
	 **/
	public String getBatchOpertId() {
		return batchOpertId;
	}

	/**
	 * @return the executCycle
	 **/
	public String getExecutCycle() {
		return executCycle;
	}

	/**
	 * @return the executSchdulDe
	 **/
	public String getExecutSchdulDe() {
		return executSchdulDe;
	}

	/**
	 * @return the executSchdulHour
	 **/
	public String getExecutSchdulHour() {
		return executSchdulHour;
	}

	/**
	 * @return the executSchdulMnt
	 **/
	public String getExecutSchdulMnt() {
		return executSchdulMnt;
	}

	/**
	 * @return the executSchdulSecnd
	 **/
	public String getExecutSchdulSecnd() {
		return executSchdulSecnd;
	}

	/**
	 * @return the executSchdulDfkSes
	 **/
	public String[] getExecutSchdulDfkSes() {
		// return executSchdulDfkSes;
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
	 **/
	public String getLastUpdusrId() {
		return lastUpdusrId;
	}

	/**
	 * @return the lastUpdusrPnttm
	 **/
	public String getLastUpdusrPnttm() {
		return lastUpdusrPnttm;
	}

	/**
	 * @return the frstRegisterId
	 **/
	public String getFrstRegisterId() {
		return frstRegisterId;
	}

	/**
	 * @return the frstRegisterPnttm
	 **/
	public String getFrstRegisterPnttm() {
		return frstRegisterPnttm;
	}

	/**
	 * @return the batchOpertNm
	 **/
	public String getBatchOpertNm() {
		return batchOpertNm;
	}

	/**
	 * @return the batchProgrm
	 **/
	public String getBatchProgrm() {
		return batchProgrm;
	}

	/**
	 * @return the executCycleNm
	 **/
	public String getExecutCycleNm() {
		return executCycleNm;
	}

	/**
	 * @param batchSchdulId the batchSchdulId to set
	 **/
	public void setBatchSchdulId(String batchSchdulId) {
		this.batchSchdulId = batchSchdulId;
	}

	/**
	 * @param batchOpertId the batchOpertId to set
	 **/
	public void setBatchOpertId(String batchOpertId) {
		this.batchOpertId = batchOpertId;
	}

	/**
	 * @param executCycle the executCycle to set
	 **/
	public void setExecutCycle(String executCycle) {
		this.executCycle = executCycle;
	}

	/**
	 * @param executSchdulDe the executSchdulDe to set
	 **/
	public void setExecutSchdulDe(String executSchdulDe) {
		this.executSchdulDe = executSchdulDe;
	}

	/**
	 * @param executSchdulHour the executSchdulHour to set
	 **/
	public void setExecutSchdulHour(String executSchdulHour) {
		this.executSchdulHour = executSchdulHour;
	}

	/**
	 * @param executSchdulMnt the executSchdulMnt to set
	 **/
	public void setExecutSchdulMnt(String executSchdulMnt) {
		this.executSchdulMnt = executSchdulMnt;
	}

	/**
	 * @param executSchdulSecnd the executSchdulSecnd to set
	 **/
	public void setExecutSchdulSecnd(String executSchdulSecnd) {
		this.executSchdulSecnd = executSchdulSecnd;
	}

	/**
	 * @param executSchdulDfkSes the executSchdulDfkSes to set
	 **/
	public void setExecutSchdulDfkSes(String[] executSchdulDfkSes) {
		// this.executSchdulDfkSes = executSchdulDfkSes;
		this.executSchdulDfkSes = new String[executSchdulDfkSes.length];
		for (int i = 0; i < executSchdulDfkSes.length; ++i) {
			this.executSchdulDfkSes[i] = executSchdulDfkSes[i];
		}
	}

	/**
	 * @param lastUpdusrId the lastUpdusrId to set
	 **/
	public void setLastUpdusrId(String lastUpdusrId) {
		this.lastUpdusrId = lastUpdusrId;
	}

	/**
	 * @param lastUpdusrPnttm the lastUpdusrPnttm to set
	 **/
	public void setLastUpdusrPnttm(String lastUpdusrPnttm) {
		this.lastUpdusrPnttm = lastUpdusrPnttm;
	}

	/**
	 * @param frstRegisterId the frstRegisterId to set
	 **/
	public void setFrstRegisterId(String frstRegisterId) {
		this.frstRegisterId = frstRegisterId;
	}

	/**
	 * @param frstRegisterPnttm the frstRegisterPnttm to set
	 **/
	public void setFrstRegisterPnttm(String frstRegisterPnttm) {
		this.frstRegisterPnttm = frstRegisterPnttm;
	}

	/**
	 * @param batchOpertNm the batchOpertNm to set
	 **/
	public void setBatchOpertNm(String batchOpertNm) {
		this.batchOpertNm = batchOpertNm;
	}

	/**
	 * @param batchProgrm the batchProgrm to set
	 **/
	public void setBatchProgrm(String batchProgrm) {
		this.batchProgrm = batchProgrm;
	}

	/**
	 * @param executCycleNm the executCycleNm to set
	 **/
	public void setExecutCycleNm(String executCycleNm) {
		this.executCycleNm = executCycleNm;
	}

	/**
	 * @return the executSchdul
	 **/
	public String getExecutSchdul() {
		return executSchdul;
	}

	/**
	 * @param executSchdul the executSchdul to set
	 **/
	public void setExecutSchdul(String executSchdul) {
		this.executSchdul = executSchdul;
	}

	/**
	 * ??? ?? ???????????? ??executSchdul ????????
	 *
	 * @param dfkSeList List<BatchSchdulDfk>? ???????
	 **/
	public void makeExecutSchdul(List<BatchSchdulDfk> dfkSeList) {
		String executSchdul = "";
		String executSchdulDeNm = "";

		// ?? ???
		if (this.executCycle.equals("02") || this.executCycle.equals("01")) {
			// ? ???????????? ?????? ????
			executSchdulDeNm = "";
		} else if (this.executCycle.equals("03")) {
			// ????
			if (!"".equals(this.executSchdulDe)) {
				executSchdulDeNm = executSchdulDeNm + this.executSchdulDe.substring(6, 8) + "??";
			}
		} else if (this.executCycle.equals("04")) {
			// ???????
			if (!"".equals(this.executSchdulDe)) {
				executSchdulDeNm = executSchdulDeNm + this.executSchdulDe.substring(4, 6) + "-"
						+ this.executSchdulDe.substring(6, 8) + " ";
			}
		} else {
			// ????????
			if (!"".equals(this.executSchdulDe)) {
				executSchdulDeNm = executSchdulDeNm + this.executSchdulDe.substring(0, 4) + "-"
						+ this.executSchdulDe.substring(4, 6) + "-" + this.executSchdulDe.substring(6, 8)
						+ " ";
			}
		}

		// ?? ???
		executSchdul = executSchdul + executSchdulDeNm;

		// ????
		if (this.executCycle.equals("02")) {
			// ??? ????? ????.
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

		// ?? ?? ?????
		// ??????????.
		executSchdul = executSchdul + this.executSchdulHour + ":" + this.executSchdulMnt + ":" + this.executSchdulSecnd;

		// ????
		this.executSchdul = executSchdul;

	}

	/**
	 * ???????CronExpression?? ??????.
	 ***/
	public String toCronExpression() {
		String cronExpression = "";

		// ????
		cronExpression = cronExpression + this.executSchdulSecnd;

		// ????
		cronExpression = cronExpression + " " + this.executSchdulMnt;

		// ?????
		cronExpression = cronExpression + " " + this.executSchdulHour;

		// ?????
		if (this.executCycle.equals("01")) {
			// ????"*" ???
			cronExpression = cronExpression + " " + "*";
		} else if (this.executCycle.equals("02")) {
			// ????"?" ???
			cronExpression = cronExpression + " " + "?";
		} else {
			// ???????????
			cronExpression = cronExpression + " " + this.executSchdulDe.substring(6, 8);
		}

		// ????
		if (this.executCycle.equals("01") || this.executCycle.equals("02") || this.executCycle.equals("03")) {
			// ???????"*" ???
			cronExpression = cronExpression + " " + "*";
		} else {
			// ???????????
			cronExpression = cronExpression + " " + this.executSchdulDe.substring(4, 6);
		}

		// ???
		if (this.executCycle.equals("02")) {
			// ???day of week?????
			String dayOfWeek = "";
			for (int i = 0; i < this.executSchdulDfkSes.length; i++) {
				if (i != 0) {
					dayOfWeek = dayOfWeek + ",";
				}
				dayOfWeek = dayOfWeek + this.executSchdulDfkSes[i];
			}
			cronExpression = cronExpression + " " + dayOfWeek;
		} else {
			// ??????"?" ???
			cronExpression = cronExpression + " " + "?";
		}

		// ????
		if (this.executCycle.equals("05")) {
			// ???? ? ???
			cronExpression = cronExpression + " " + this.executSchdulDe.substring(0, 4);
		}
		return cronExpression;

	}

	/**
	 * @return the paramtr
	 **/
	public String getParamtr() {
		return paramtr;
	}

	/**
	 * @param paramtr the paramtr to set
	 **/
	public void setParamtr(String paramtr) {
		this.paramtr = paramtr;
	}

}
