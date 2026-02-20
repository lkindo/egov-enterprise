package egovframework.com.sym.bat.service;

import java.io.Serializable;

/**
 * ??????? ????model ?????
 *
 * @author ?
 * @version 1.0
 * @see
 * <pre>
 * == ?????Modification Information) ==
 *
 *   ????      ????          ????
 *  -------     --------    ---------------------------
 *  2010.08.23   ?    ????
 * </pre>
 **/
public class BatchSchdulDfk implements Serializable {

	private static final long serialVersionUID = -4152071306992470303L;

	/**
	 * ????D
	 **/
	private String batchSchdulId;

	/**
	 * ????????
	 **/
	private String executSchdulDfkSe;

	/**
	 * ????????
	 **/
	private String executSchdulDfkSeNm;


	/**
	 * @return the batchSchdulId
	 **/
	public String getBatchSchdulId() {
		return batchSchdulId;
	}
	/**
	 * @return the executSchdulDfkSe
	 **/
	public String getExecutSchdulDfkSe() {
		return executSchdulDfkSe;
	}
	/**
	 * @param batchSchdulId the batchSchdulId to set
	 **/
	public void setBatchSchdulId(String batchSchdulId) {
		this.batchSchdulId = batchSchdulId;
	}
	/**
	 * @param executSchdulDfkSe the executSchdulDfkSe to set
	 **/
	public void setExecutSchdulDfkSe(String executSchdulDfkSe) {
		this.executSchdulDfkSe = executSchdulDfkSe;
	}
	/**
	 * @return the executSchdulDfkSeNm
	 **/
	public String getExecutSchdulDfkSeNm() {
		return executSchdulDfkSeNm;
	}
	/**
	 * @param executSchdulDfkSeNm the executSchdulDfkSeNm to set
	 **/
	public void setExecutSchdulDfkSeNm(String executSchdulDfkSeNm) {
		this.executSchdulDfkSeNm = executSchdulDfkSeNm;
	}



}
