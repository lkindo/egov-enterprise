package egovframework.com.uss.ion.rmm.service;

/**
 * 媛쒖슂
 * - ?쎈룄?????Model???뺤쓽?쒕떎.
 *
 * ?곸꽭?댁슜
 * - ?쎈룄 ?뺣낫瑜?愿由ы븳??
 *
 * @author ?μ갔??
 * @since 2014.08.27
 * @version 1.0
 * @see
 *
 * <pre>
 * << 媛쒖젙?대젰(Modification Information) >>
 *
 *   ?섏젙??		?섏젙??	?섏젙?댁슜
 *  -----------		------		---------
 *   2014.08.27		?μ갔??	理쒖큹 ?앹꽦
 *
 * </pre>
 */

public class RoughMapVO extends RoughMapDefaultVO {

	private static final long serialVersionUID = -2344076278228282853L;

	/** roughMap ID */
    private String roughMapId;

	/** roughMap ?쒕ぉ */
    private String roughMapSj;

	/** roughMap ?곸꽭二쇱냼 */
    private String roughMapAddress;

    /** 吏???꾨룄 */
    private String la;

    /** 吏??寃쎈룄 */
    private String lo;

    /** 留덉빱 ?꾨룄 */
    private String markerLa;

    /** 留덉빱 寃쎈룄 */
    private String markerLo;

    /** ?명룷?덈룄??留먰뭾?? */
    private String infoWindow;

    /** 吏???뺣??섏? */
    private String zoomLevel;

    /** 理쒖큹?깅줉?쒖젏 */
    private String frstRegisterPnttm;

    /** 理쒖큹?깅줉?륤D */
    private String frstRegisterId;

    /** 理쒖쥌?섏젙?쒖젏 */
    private String lastUpdusrPnttm;

    /** 理쒖쥌?섏젙?륤D */
    private String lastUpdusrId;

	/**
	 * roughMapId attribute瑜?由ы꽩?쒕떎.
	 * @return the Integer
	 */
    public String getRoughMapId() {
		return roughMapId;
	}

    /**
     * roughMapId瑜???ν븳??
     * @param roughMapId
     */
    public void setRoughMapId(String roughMapId) {
		this.roughMapId = roughMapId;
	}

	/**
	 * roughMapSj attribute瑜?由ы꽩?쒕떎.
	 * @return the String
	 */
	public String getRoughMapSj() {
		return roughMapSj;
	}

    /**
     * roughMapSj瑜???ν븳??
     * @param roughMapSj
     */
	public void setRoughMapSj(String roughMapSj) {
		this.roughMapSj = roughMapSj;
	}

	/**
	 * roughMapAddress attribute瑜?由ы꽩?쒕떎.
	 * @return the String
	 */
	public String getRoughMapAddress() {
		return roughMapAddress;
	}

    /**
     * roughMapAddress瑜???ν븳??
     * @param roughMapAddress
     */
	public void setRoughMapAddress(String roughMapAddress) {
		this.roughMapAddress = roughMapAddress;
	}

	/**
	 * la attribute瑜?由ы꽩?쒕떎.
	 * @return the String
	 */
	public String getLa() {
		return la;
	}

    /**
     * la瑜???ν븳??
     * @param la
     */
	public void setLa(String la) {
		this.la = la;
	}

	/**
	 * lo attribute瑜?由ы꽩?쒕떎.
	 * @return the String
	 */
	public String getLo() {
		return lo;
	}

    /**
     * lo瑜???ν븳??
     * @param lo
     */
	public void setLo(String lo) {
		this.lo = lo;
	}

	/**
	 * markerLa attribute瑜?由ы꽩?쒕떎.
	 * @return the String
	 */
	public String getMarkerLa() {
		return markerLa;
	}

    /**
     * markerLa瑜???ν븳??
     * @param markerLa
     */
	public void setMarkerLa(String markerLa) {
		this.markerLa = markerLa;
	}

	/**
	 * markerLo attribute瑜?由ы꽩?쒕떎.
	 * @return the String
	 */
	public String getMarkerLo() {
		return markerLo;
	}

    /**
     * markerLo瑜???ν븳??
     * @param markerLo
     */
	public void setMarkerLo(String markerLo) {
		this.markerLo = markerLo;
	}

	/**
	 * @return the String
	 * infoWindow attribute瑜?由ы꽩?쒕떎.
	 */
	public String getInfoWindow() {
		return infoWindow;
	}


    /**
     * infoWindow瑜???ν븳??
     * @param infoWindow
     */
	public void setInfoWindow(String infoWindow) {
		this.infoWindow = infoWindow;
	}

	/**
	 * mapLevel attribute瑜?由ы꽩?쒕떎.
	 * @return the String
	 */
	public String getZoomLevel() {
		return zoomLevel;
	}

    /**
     * mapLevel瑜???ν븳??
     * @param mapLevel
     */
	public void setZoomLevel(String zoomLevel) {
		this.zoomLevel = zoomLevel;
	}

	/**
	 * frstRegisterPnttm attribute瑜?由ы꽩?쒕떎.
	 * @return the String
	 */
	public String getFrstRegisterPnttm() {
		return frstRegisterPnttm;
	}

    /**
     * frstRegisterPnttm瑜???ν븳??
     * @param frstRegisterPnttm
     */
	public void setFrstRegisterPnttm(String frstRegisterPnttm) {
		this.frstRegisterPnttm = frstRegisterPnttm;
	}

	/**
	 * frstRegisterId attribute瑜?由ы꽩?쒕떎.
	 * @return the String
	 */
	public String getFrstRegisterId() {
		return frstRegisterId;
	}

    /**
     * frstRegisterId瑜???ν븳??
     * @param frstRegisterId
     */
	public void setFrstRegisterId(String frstRegisterId) {
		this.frstRegisterId = frstRegisterId;
	}

	/**
	 * lastUpdusrPnttm attribute瑜?由ы꽩?쒕떎.
	 * @return the String
	 */
	public String getLastUpdusrPnttm() {
		return lastUpdusrPnttm;
	}

    /**
     * lastUpdusrPnttm瑜???ν븳??
     * @param lastUpdusrPnttm
     */
	public void setLastUpdusrPnttm(String lastUpdusrPnttm) {
		this.lastUpdusrPnttm = lastUpdusrPnttm;
	}

	/**
	 * lastUpdusrId attribute瑜?由ы꽩?쒕떎.
	 * @return the String
	 */
	public String getLastUpdusrId() {
		return lastUpdusrId;
	}

    /**
     * lastUpdusrId瑜???ν븳??
     * @param lastUpdusrId
     */
	public void setLastUpdusrId(String lastUpdusrId) {
		this.lastUpdusrId = lastUpdusrId;
	}

}
