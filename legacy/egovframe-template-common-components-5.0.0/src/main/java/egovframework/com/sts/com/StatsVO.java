package egovframework.com.sts.com;

/**
 * ?듦퀎 寃곌낵 VO ?대옒??
 * @author 怨듯넻?쒕퉬??媛쒕컻? 諛뺤???
 * @since 2009.03.12
 * @version 1.0
 * @see
 *
 * <pre>
 * << 媛쒖젙?대젰(Modification Information) >>
 *
 *   ?섏젙??     ?섏젙??         ?섏젙?댁슜
 *  -------    --------    ---------------------------
 *  2009.03.19  諛뺤???         理쒖큹 ?앹꽦
 *  2011.06.30  ?닿린??         ?⑦궎吏 遺꾨━(sts -> sts.com)
 *
 *  </pre>
 */
public class StatsVO {

	/** 寃곌낵?듦퀎??*/
	private int statsCo;
	/** 寃곌낵?쇱옄 */
	private String statsDate;
	/** 理쒕??듦퀎??*/
	private int maxStatsCo;
	/** 理쒖냼?듦퀎??*/
	private int minStatsCo;
	/** ?앹꽦湲??*/
	private int creatCo;
	/** 珥앹“?뚯닔 */
	private int totInqireCo;
	/** ?됯퇏議고쉶??*/
	private float avrgInqireCo;
	/** 理쒕?議고쉶寃뚯떆臾퍲D */
	private String mxmmInqireBbsId;
	/** 理쒕?議고쉶寃뚯떆臾쇱젣紐?*/
	private String mxmmInqireBbsNm;
	/** 理쒖냼議고쉶寃뚯떆臾퍲D */
	private String mummInqireBbsId;
	/** 理쒖냼議고쉶寃뚯떆臾쇱젣紐?*/
	private String mummInqireBbsNm;
	/** 理쒓퀬寃뚯떆?륤D */
	private String topNtcepersonId;
	/** 理쒓퀬寃뚯떆湲??*/
	private int topNtcepersonCo;
	/** ?묒냽?꾨줈洹몃옩硫붿냼??*/
	private String conectMethod;
	/** ?섏젙湲??*/
	private int updtCo;
	/** 議고쉶湲??*/
	private int inqireCo;
	/** ??젣湲??*/
	private int deleteCo;
	/** 異쒕젰?잛닔 */
	private int outptCo;
	/** ?먮윭?잛닔 */
	private int errorCo;
	/** ?쒖옉?쇱옄 */
	private String fromDate;
	/** 醫낅즺?쇱옄 */
	private String toDate;
	/** 湲곌컙援щ텇 */
	private String pdKind;
	/** ?듦퀎援щ텇 */
	private String statsKind;
	/** ?몃??듦퀎援щ텇 */
	private String detailStatsKind;
	/** ??뎄遺?*/
	private String tabKind;
	/** 洹몃옒?꾧만??*/
	private float maxUnit;
	/**
	 * statsCo attribute 瑜?由ы꽩?쒕떎.
	 * @return int
	 */
	public int getStatsCo() {
		return statsCo;
	}
	/**
	 * statsCo attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * @param statsCo int
	 */
	public void setStatsCo(int statsCo) {
		this.statsCo = statsCo;
	}
	/**
	 * statsDate attribute 瑜?由ы꽩?쒕떎.
	 * @return String
	 */
	public String getStatsDate() {
		return statsDate;
	}
	/**
	 * statsDate attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * @param statsDate String
	 */
	public void setStatsDate(String statsDate) {
		this.statsDate = statsDate;
	}
	/**
	 * maxStatsCo attribute 瑜?由ы꽩?쒕떎.
	 * @return int
	 */
	public int getMaxStatsCo() {
		return maxStatsCo;
	}
	/**
	 * maxStatsCo attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * @param maxStatsCo int
	 */
	public void setMaxStatsCo(int maxStatsCo) {
		this.maxStatsCo = maxStatsCo;
	}
	/**
	 * minStatsCo attribute 瑜?由ы꽩?쒕떎.
	 * @return int
	 */
	public int getMinStatsCo() {
		return minStatsCo;
	}
	/**
	 * minStatsCo attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * @param minStatsCo int
	 */
	public void setMinStatsCo(int minStatsCo) {
		this.minStatsCo = minStatsCo;
	}
	/**
	 * creatCo attribute 瑜?由ы꽩?쒕떎.
	 * @return int
	 */
	public int getCreatCo() {
		return creatCo;
	}
	/**
	 * creatCo attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * @param creatCo int
	 */
	public void setCreatCo(int creatCo) {
		this.creatCo = creatCo;
	}
	/**
	 * totInqireCo attribute 瑜?由ы꽩?쒕떎.
	 * @return int
	 */
	public int getTotInqireCo() {
		return totInqireCo;
	}
	/**
	 * totInqireCo attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * @param totInqireCo int
	 */
	public void setTotInqireCo(int totInqireCo) {
		this.totInqireCo = totInqireCo;
	}
	/**
	 * avrgInqireCo attribute 瑜?由ы꽩?쒕떎.
	 * @return float
	 */
	public float getAvrgInqireCo() {
		return avrgInqireCo;
	}
	/**
	 * avrgInqireCo attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * @param avrgInqireCo float
	 */
	public void setAvrgInqireCo(float avrgInqireCo) {
		this.avrgInqireCo = avrgInqireCo;
	}
	/**
	 * mxmmInqireBbsId attribute 瑜?由ы꽩?쒕떎.
	 * @return String
	 */
	public String getMxmmInqireBbsId() {
		return mxmmInqireBbsId;
	}
	/**
	 * mxmmInqireBbsId attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * @param mxmmInqireBbsId String
	 */
	public void setMxmmInqireBbsId(String mxmmInqireBbsId) {
		this.mxmmInqireBbsId = mxmmInqireBbsId;
	}
	/**
	 * mxmmInqireBbsNm attribute 瑜?由ы꽩?쒕떎.
	 * @return String
	 */
	public String getMxmmInqireBbsNm() {
		return mxmmInqireBbsNm;
	}
	/**
	 * mxmmInqireBbsNm attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * @param mxmmInqireBbsNm String
	 */
	public void setMxmmInqireBbsNm(String mxmmInqireBbsNm) {
		this.mxmmInqireBbsNm = mxmmInqireBbsNm;
	}
	/**
	 * mummInqireBbsId attribute 瑜?由ы꽩?쒕떎.
	 * @return String
	 */
	public String getMummInqireBbsId() {
		return mummInqireBbsId;
	}
	/**
	 * mummInqireBbsId attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * @param mummInqireBbsId String
	 */
	public void setMummInqireBbsId(String mummInqireBbsId) {
		this.mummInqireBbsId = mummInqireBbsId;
	}
	/**
	 * mummInqireBbsNm attribute 瑜?由ы꽩?쒕떎.
	 * @return String
	 */
	public String getMummInqireBbsNm() {
		return mummInqireBbsNm;
	}
	/**
	 * mummInqireBbsNm attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * @param mummInqireBbsNm String
	 */
	public void setMummInqireBbsNm(String mummInqireBbsNm) {
		this.mummInqireBbsNm = mummInqireBbsNm;
	}
	/**
	 * topNtcepersonId attribute 瑜?由ы꽩?쒕떎.
	 * @return String
	 */
	public String getTopNtcepersonId() {
		return topNtcepersonId;
	}
	/**
	 * topNtcepersonId attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * @param topNtcepersonId String
	 */
	public void setTopNtcepersonId(String topNtcepersonId) {
		this.topNtcepersonId = topNtcepersonId;
	}
	/**
	 * topNtcepersonCo attribute 瑜?由ы꽩?쒕떎.
	 * @return int
	 */
	public int getTopNtcepersonCo() {
		return topNtcepersonCo;
	}
	/**
	 * topNtcepersonCo attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * @param topNtcepersonCo int
	 */
	public void setTopNtcepersonCo(int topNtcepersonCo) {
		this.topNtcepersonCo = topNtcepersonCo;
	}
	/**
	 * conectMethod attribute 瑜?由ы꽩?쒕떎.
	 * @return String
	 */
	public String getConectMethod() {
		return conectMethod;
	}
	/**
	 * conectMethod attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * @param conectMethod String
	 */
	public void setConectMethod(String conectMethod) {
		this.conectMethod = conectMethod;
	}
	/**
	 * updtCo attribute 瑜?由ы꽩?쒕떎.
	 * @return int
	 */
	public int getUpdtCo() {
		return updtCo;
	}
	/**
	 * updtCo attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * @param updtCo int
	 */
	public void setUpdtCo(int updtCo) {
		this.updtCo = updtCo;
	}
	/**
	 * inqireCo attribute 瑜?由ы꽩?쒕떎.
	 * @return int
	 */
	public int getInqireCo() {
		return inqireCo;
	}
	/**
	 * inqireCo attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * @param inqireCo int
	 */
	public void setInqireCo(int inqireCo) {
		this.inqireCo = inqireCo;
	}
	/**
	 * deleteCo attribute 瑜?由ы꽩?쒕떎.
	 * @return int
	 */
	public int getDeleteCo() {
		return deleteCo;
	}
	/**
	 * deleteCo attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * @param deleteCo int
	 */
	public void setDeleteCo(int deleteCo) {
		this.deleteCo = deleteCo;
	}
	/**
	 * outptCo attribute 瑜?由ы꽩?쒕떎.
	 * @return int
	 */
	public int getOutptCo() {
		return outptCo;
	}
	/**
	 * outptCo attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * @param outptCo int
	 */
	public void setOutptCo(int outptCo) {
		this.outptCo = outptCo;
	}
	/**
	 * errorCo attribute 瑜?由ы꽩?쒕떎.
	 * @return int
	 */
	public int getErrorCo() {
		return errorCo;
	}
	/**
	 * errorCo attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * @param errorCo int
	 */
	public void setErrorCo(int errorCo) {
		this.errorCo = errorCo;
	}
	/**
	 * fromDate attribute 瑜?由ы꽩?쒕떎.
	 * @return String
	 */
	public String getFromDate() {
		return fromDate;
	}
	/**
	 * fromDate attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * @param fromDate String
	 */
	public void setFromDate(String fromDate) {
		this.fromDate = fromDate;
	}
	/**
	 * toDate attribute 瑜?由ы꽩?쒕떎.
	 * @return String
	 */
	public String getToDate() {
		return toDate;
	}
	/**
	 * toDate attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * @param toDate String
	 */
	public void setToDate(String toDate) {
		this.toDate = toDate;
	}
	/**
	 * pdKind attribute 瑜?由ы꽩?쒕떎.
	 * @return String
	 */
	public String getPdKind() {
		return pdKind;
	}
	/**
	 * pdKind attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * @param pdKind String
	 */
	public void setPdKind(String pdKind) {
		this.pdKind = pdKind;
	}
	/**
	 * statsKind attribute 瑜?由ы꽩?쒕떎.
	 * @return String
	 */
	public String getStatsKind() {
		return statsKind;
	}
	/**
	 * statsKind attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * @param statsKind String
	 */
	public void setStatsKind(String statsKind) {
		this.statsKind = statsKind;
	}
	/**
	 * detailStatsKind attribute 瑜?由ы꽩?쒕떎.
	 * @return String
	 */
	public String getDetailStatsKind() {
		return detailStatsKind;
	}
	/**
	 * detailStatsKind attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * @param detailStatsKind String
	 */
	public void setDetailStatsKind(String detailStatsKind) {
		this.detailStatsKind = detailStatsKind;
	}
	/**
	 * tabKind attribute 瑜?由ы꽩?쒕떎.
	 * @return String
	 */
	public String getTabKind() {
		return tabKind;
	}
	/**
	 * tabKind attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * @param tabKind String
	 */
	public void setTabKind(String tabKind) {
		this.tabKind = tabKind;
	}
	/**
	 * maxUnit attribute 瑜?由ы꽩?쒕떎.
	 * @return float
	 */
	public float getMaxUnit() {
		return maxUnit;
	}
	/**
	 * maxUnit attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * @param maxUnit float
	 */
	public void setMaxUnit(float maxUnit) {
		this.maxUnit = maxUnit;
	}
}
