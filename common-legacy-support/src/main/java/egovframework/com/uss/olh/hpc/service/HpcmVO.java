package egovframework.com.uss.olh.hpc.service;

import org.apache.commons.lang3.builder.ToStringBuilder;

public class HpcmVO extends HpcmDefaultVO{
	
	 private static final long serialVersionUID = 1L;
	    
	    /** ???ID **/
	    private String hpcmId;
	    
	    /** ?????**/
	    private String hpcmSeCode;

	    /** ????? **/
	    private String hpcmSeCodeNm;
	    
	    /** ?????**/
	    private String hpcmDf;
	    
	    /** ????? **/
	    private String hpcmDc;
	    
	    /** ???? **/
	    private String frstRegisterPnttm;

	    /** ??? **/
	    private String frstRegisterId;

	    /** ???? **/
	    private String lastUpdusrPnttm;

	    /** ??? **/
	    private String lastUpdusrId;

		/**
		 * hpcmId attribute ?????.
		 * @return the String
		 **/
		public String getHpcmId() {
			return hpcmId;
		}

		/**
		 * hpcmId attribute ???????.
		 * @return hpcmId String
		 **/
		public void setHpcmId(String hpcmId) {
			this.hpcmId = hpcmId;
		}

		/**
		 * hpcmSeCode attribute ?????.
		 * @return the String
		 **/
		public String getHpcmSeCode() {
			return hpcmSeCode;
		}

		/**
		 * hpcmSeCode attribute ???????.
		 * @return hpcmSeCode String
		 **/
		public void setHpcmSeCode(String hpcmSeCode) {
			this.hpcmSeCode = hpcmSeCode;
		}

		/**
		 * hpcmSeCodeNm attribute ?????.
		 * @return the String
		 **/
		public String getHpcmSeCodeNm() {
			return hpcmSeCodeNm;
		}

		/**
		 * hpcmSeCodeNm attribute ???????.
		 * @return hpcmSeCodeNm String
		 **/
		public void setHpcmSeCodeNm(String hpcmSeCodeNm) {
			this.hpcmSeCodeNm = hpcmSeCodeNm;
		}

		/**
		 * hpcmDf attribute ?????.
		 * @return the String
		 **/
		public String getHpcmDf() {
			return hpcmDf;
		}

		/**
		 * hpcmDf attribute ???????.
		 * @return hpcmDf String
		 **/
		public void setHpcmDf(String hpcmDf) {
			this.hpcmDf = hpcmDf;
		}

		/**
		 * hpcmDc attribute ?????.
		 * @return the String
		 **/
		public String getHpcmDc() {
			return hpcmDc;
		}

		/**
		 * hpcmDc attribute ???????.
		 * @return hpcmDc String
		 **/
		public void setHpcmDc(String hpcmDc) {
			this.hpcmDc = hpcmDc;
		}

		/**
		 * frstRegisterPnttm attribute ?????.
		 * @return the String
		 **/
		public String getFrstRegisterPnttm() {
			return frstRegisterPnttm;
		}

		/**
		 * frstRegisterPnttm attribute ???????.
		 * @return frstRegisterPnttm String
		 **/
		public void setFrstRegisterPnttm(String frstRegisterPnttm) {
			this.frstRegisterPnttm = frstRegisterPnttm;
		}

		/**
		 * frstRegisterId attribute ?????.
		 * @return the String
		 **/
		public String getFrstRegisterId() {
			return frstRegisterId;
		}

		/**
		 * frstRegisterId attribute ???????.
		 * @return frstRegisterId String
		 **/
		public void setFrstRegisterId(String frstRegisterId) {
			this.frstRegisterId = frstRegisterId;
		}

		/**
		 * lastUpdusrPnttm attribute ?????.
		 * @return the String
		 **/
		public String getLastUpdusrPnttm() {
			return lastUpdusrPnttm;
		}

		/**
		 * lastUpdusrPnttm attribute ???????.
		 * @return lastUpdusrPnttm String
		 **/
		public void setLastUpdusrPnttm(String lastUpdusrPnttm) {
			this.lastUpdusrPnttm = lastUpdusrPnttm;
		}

		/**
		 * lastUpdusrId attribute ?????.
		 * @return the String
		 **/
		public String getLastUpdusrId() {
			return lastUpdusrId;
		}

		/**
		 * lastUpdusrId attribute ???????.
		 * @return lastUpdusrId String
		 **/
		public void setLastUpdusrId(String lastUpdusrId) {
			this.lastUpdusrId = lastUpdusrId;
		}
		
		/**
		 * toString ???? ????
		 **/
		public String toString(){
			return ToStringBuilder.reflectionToString(this);
		}
}
