package egovframework.com.uss.olh.hpc.service;

import org.apache.commons.lang3.builder.ToStringBuilder;

public class HpcmVO extends HpcmDefaultVO{
	
	 private static final long serialVersionUID = 1L;
	    
	    /** ?꾩?留?ID */
	    private String hpcmId;
	    
	    /** ?꾩?留먭뎄遺꾩퐫??*/
	    private String hpcmSeCode;

	    /** ?꾩?留먭뎄遺꾩퐫?쒕챸 */
	    private String hpcmSeCodeNm;
	    
	    /** ?꾩?留먯젙??*/
	    private String hpcmDf;
	    
	    /** ?꾩?留??ㅻ챸 */
	    private String hpcmDc;
	    
	    /** 理쒖큹?깅줉?쒖젏 */
	    private String frstRegisterPnttm;

	    /** 理쒖큹?깅줉?륤D */
	    private String frstRegisterId;

	    /** 理쒖쥌?섏젙?쒖젏 */
	    private String lastUpdusrPnttm;

	    /** 理쒖쥌?섏젙?륤D */
	    private String lastUpdusrId;

		/**
		 * hpcmId attribute 瑜?由ы꽩?쒕떎.
		 * @return the String
		 */
		public String getHpcmId() {
			return hpcmId;
		}

		/**
		 * hpcmId attribute 媛믪쓣 ?ㅼ젙?쒕떎.
		 * @return hpcmId String
		 */
		public void setHpcmId(String hpcmId) {
			this.hpcmId = hpcmId;
		}

		/**
		 * hpcmSeCode attribute 瑜?由ы꽩?쒕떎.
		 * @return the String
		 */
		public String getHpcmSeCode() {
			return hpcmSeCode;
		}

		/**
		 * hpcmSeCode attribute 媛믪쓣 ?ㅼ젙?쒕떎.
		 * @return hpcmSeCode String
		 */
		public void setHpcmSeCode(String hpcmSeCode) {
			this.hpcmSeCode = hpcmSeCode;
		}

		/**
		 * hpcmSeCodeNm attribute 瑜?由ы꽩?쒕떎.
		 * @return the String
		 */
		public String getHpcmSeCodeNm() {
			return hpcmSeCodeNm;
		}

		/**
		 * hpcmSeCodeNm attribute 媛믪쓣 ?ㅼ젙?쒕떎.
		 * @return hpcmSeCodeNm String
		 */
		public void setHpcmSeCodeNm(String hpcmSeCodeNm) {
			this.hpcmSeCodeNm = hpcmSeCodeNm;
		}

		/**
		 * hpcmDf attribute 瑜?由ы꽩?쒕떎.
		 * @return the String
		 */
		public String getHpcmDf() {
			return hpcmDf;
		}

		/**
		 * hpcmDf attribute 媛믪쓣 ?ㅼ젙?쒕떎.
		 * @return hpcmDf String
		 */
		public void setHpcmDf(String hpcmDf) {
			this.hpcmDf = hpcmDf;
		}

		/**
		 * hpcmDc attribute 瑜?由ы꽩?쒕떎.
		 * @return the String
		 */
		public String getHpcmDc() {
			return hpcmDc;
		}

		/**
		 * hpcmDc attribute 媛믪쓣 ?ㅼ젙?쒕떎.
		 * @return hpcmDc String
		 */
		public void setHpcmDc(String hpcmDc) {
			this.hpcmDc = hpcmDc;
		}

		/**
		 * frstRegisterPnttm attribute 瑜?由ы꽩?쒕떎.
		 * @return the String
		 */
		public String getFrstRegisterPnttm() {
			return frstRegisterPnttm;
		}

		/**
		 * frstRegisterPnttm attribute 媛믪쓣 ?ㅼ젙?쒕떎.
		 * @return frstRegisterPnttm String
		 */
		public void setFrstRegisterPnttm(String frstRegisterPnttm) {
			this.frstRegisterPnttm = frstRegisterPnttm;
		}

		/**
		 * frstRegisterId attribute 瑜?由ы꽩?쒕떎.
		 * @return the String
		 */
		public String getFrstRegisterId() {
			return frstRegisterId;
		}

		/**
		 * frstRegisterId attribute 媛믪쓣 ?ㅼ젙?쒕떎.
		 * @return frstRegisterId String
		 */
		public void setFrstRegisterId(String frstRegisterId) {
			this.frstRegisterId = frstRegisterId;
		}

		/**
		 * lastUpdusrPnttm attribute 瑜?由ы꽩?쒕떎.
		 * @return the String
		 */
		public String getLastUpdusrPnttm() {
			return lastUpdusrPnttm;
		}

		/**
		 * lastUpdusrPnttm attribute 媛믪쓣 ?ㅼ젙?쒕떎.
		 * @return lastUpdusrPnttm String
		 */
		public void setLastUpdusrPnttm(String lastUpdusrPnttm) {
			this.lastUpdusrPnttm = lastUpdusrPnttm;
		}

		/**
		 * lastUpdusrId attribute 瑜?由ы꽩?쒕떎.
		 * @return the String
		 */
		public String getLastUpdusrId() {
			return lastUpdusrId;
		}

		/**
		 * lastUpdusrId attribute 媛믪쓣 ?ㅼ젙?쒕떎.
		 * @return lastUpdusrId String
		 */
		public void setLastUpdusrId(String lastUpdusrId) {
			this.lastUpdusrId = lastUpdusrId;
		}
		
		/**
		 * toString 硫붿냼?쒕? ?移섑븳??
		 */
		public String toString(){
			return ToStringBuilder.reflectionToString(this);
		}
}
