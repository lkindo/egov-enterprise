package egovframework.com.utl.fcc.service;

import java.text.NumberFormat;
import java.util.Locale;

/**
 * ?レ옄, ?듯솕, ?쇱꽱?몄뿉 ????뺤떇 蹂?섏쓣 ?섑뻾?섎뒗 ?대옒??
 */
public class EgovNumberFormat {

	private static final int MAX_FRACTION_DIGIT = 3;
	private static final boolean GROUPING_USED = true; 
	
	/**
	 * 湲곕낯 Locale???대떦?섎뒗 ?뺤떇?쇰줈 ?レ옄瑜?蹂?섑븳??
	 * 
	 * @param number ?レ옄
	 * @return ?レ옄 臾몄옄??
	 */
	public static String formatNumber(Number number) {
		return formatNumber(number, GROUPING_USED, MAX_FRACTION_DIGIT);
	}
	
	/**
	 * Locale???대떦?섎뒗 ?뺤떇?쇰줈 ?レ옄瑜?蹂?섑븳??
	 * 
	 * @param locale 濡쒖???
	 * @param number ?レ옄
	 * @return ?レ옄 臾몄옄??
	 */
	public static String formatNumber(Locale locale, Number number) {
		return formatNumber(locale, number, GROUPING_USED, MAX_FRACTION_DIGIT);
	}
	
	/**
	 * 湲곕낯 Locale???대떦?섎뒗 ?뺤떇?쇰줈 ?レ옄瑜?蹂?섑븳??
	 * 
	 * @param number ?レ옄
	 * @param groupingUsed 洹몃９ 遺꾨━湲고샇 ?ы븿 ?щ?
	 * @return ?レ옄 臾몄옄??
	 */
	public static String formatNumber(Number number, boolean groupingUsed) {
		return formatNumber(number, groupingUsed, MAX_FRACTION_DIGIT);
	}

	/**
	 * Locale???대떦?섎뒗 ?뺤떇?쇰줈 ?レ옄瑜?蹂?섑븳??
	 * 
	 * @param locale 濡쒖???
	 * @param number ?レ옄
	 * @param groupingUsed 洹몃９ 遺꾨━湲고샇 ?ы븿 ?щ?
	 * @return ?レ옄 臾몄옄??
	 */
	public static String formatNumber(Locale locale, Number number, boolean groupingUsed) {
		return formatNumber(locale, number, groupingUsed, MAX_FRACTION_DIGIT);
	}

	/**
	 * 湲곕낯 Locale???대떦?섎뒗 ?뺤떇?쇰줈 ?レ옄瑜?蹂?섑븳??
	 * 
	 * @param number ?レ옄
	 * @param maxFactionDigits 蹂?섎맂 臾몄옄?댁뿉??異쒕젰???뚯닔???댄븯 理쒕? ?먮━??
	 * @return ?レ옄 臾몄옄??
	 */
	public static String formatNumber(Number number, int maxFactionDigits) {
		return formatNumber(number, GROUPING_USED, maxFactionDigits);
	}
	
	/**
	 * Locale???대떦?섎뒗 ?뺤떇?쇰줈 ?レ옄瑜?蹂?섑븳??
	 * 
	 * @param locale 濡쒖???
	 * @param number ?レ옄
	 * @param maxFactionDigits 蹂?섎맂 臾몄옄?댁뿉??異쒕젰???뚯닔???댄븯 理쒕? ?먮━??
	 * @return ?レ옄 臾몄옄??
	 */
	public static String formatNumber(Locale locale, Number number, int maxFactionDigits) {
		return formatNumber(locale, number, GROUPING_USED, maxFactionDigits);
	}

	/**
	 * 湲곕낯 Locale???대떦?섎뒗 ?뺤떇?쇰줈 ?レ옄瑜?蹂?섑븳??
	 * 
	 * @param number ?レ옄
	 * @param groupingUsed 洹몃９ 遺꾨━湲고샇 ?ы븿 ?щ?
	 * @param maxFactionDigits 蹂?섎맂 臾몄옄?댁뿉??異쒕젰???뚯닔???댄븯 理쒕? ?먮━??
	 * @return ?レ옄 臾몄옄??
	 */
	public static String formatNumber(Number number, boolean groupingUsed, int maxFactionDigits) {
		NumberFormat numberberFormat = NumberFormat.getNumberInstance();
		numberberFormat.setGroupingUsed(groupingUsed);		
		numberberFormat.setMaximumFractionDigits(maxFactionDigits);
		return numberberFormat.format(number);
	}
	
	/**
	 * Locale???대떦?섎뒗 ?뺤떇?쇰줈 ?レ옄瑜?蹂?섑븳??
	 * 
	 * @param locale 濡쒖???
	 * @param number ?レ옄
	 * @param groupingUsed 洹몃９ 遺꾨━湲고샇 ?ы븿 ?щ?
	 * @param maxFactionDigits 蹂?섎맂 臾몄옄?댁뿉??異쒕젰???뚯닔???댄븯 理쒕? ?먮━??
	 * @return ?レ옄 臾몄옄??
	 */
	public static String formatNumber(Locale locale, Number number, boolean groupingUsed, int maxFactionDigits) {
		NumberFormat numberberFormat = NumberFormat.getNumberInstance(locale);
		numberberFormat.setGroupingUsed(groupingUsed);		
		numberberFormat.setMaximumFractionDigits(maxFactionDigits);
		return numberberFormat.format(number);
	}
	
	/**
	 * 湲곕낯 Locale???대떦?섎뒗 ?뺤떇?쇰줈 ?듯솕瑜?蹂?섑븳??
	 * 
	 * @param number ?レ옄
	 * @return ?듯솕 臾몄옄??
	 */
	public static String formatCurrency(Number number) {
		return formatCurrency(number, GROUPING_USED);
	}
	
	/**
	 * Locale???대떦?섎뒗 ?뺤떇?쇰줈 ?듯솕瑜?蹂?섑븳??
	 * 
	 * @param locale 濡쒖???
	 * @param number ?レ옄
	 * @return ?듯솕 臾몄옄??
	 */
	public static String formatCurrency(Locale locale, Number number) {
		return formatCurrency(locale, number, GROUPING_USED);
	}
	
	/**
	 * 湲곕낯 Locale???대떦?섎뒗 ?뺤떇?쇰줈 ?듯솕瑜?蹂?섑븳??
	 * 
	 * @param number ?レ옄
	 * @param groupingUsed 洹몃９ 遺꾨━湲고샇 ?ы븿 ?щ?
	 * @return ?듯솕 臾몄옄??
	 */
	public static String formatCurrency(Number number, boolean groupingUsed) {
		NumberFormat numberberFormat = NumberFormat.getCurrencyInstance();
		numberberFormat.setGroupingUsed(groupingUsed);		
		return numberberFormat.format(number);
	}

	/**
	 * Locale???대떦?섎뒗 ?뺤떇?쇰줈 ?듯솕瑜?蹂?섑븳??
	 * 
	 * @param locale 濡쒖???
	 * @param number ?レ옄
	 * @param groupingUsed 洹몃９ 遺꾨━湲고샇 ?ы븿 ?щ?
	 * @return ?듯솕 臾몄옄??
	 */
	public static String formatCurrency(Locale locale, Number number, boolean groupingUsed) {
		NumberFormat numberberFormat = NumberFormat.getCurrencyInstance(locale);
		numberberFormat.setGroupingUsed(groupingUsed);		
		return numberberFormat.format(number);
	}	

	/**
	 * 湲곕낯 Locale???대떦?섎뒗 ?뺤떇?쇰줈 ?쇱꽱?몃? 蹂?섑븳??
	 * 
	 * @param number ?レ옄
	 * @return ?쇱꽱??臾몄옄??
	 */
	public static String formatPercent(Number number) {
		return formatPercent(number, GROUPING_USED, MAX_FRACTION_DIGIT);
	}
	
	/**
	 * Locale???대떦?섎뒗 ?뺤떇?쇰줈 ?쇱꽱?몃? 蹂?섑븳??
	 * 
	 * @param locale 濡쒖???
	 * @param number ?レ옄
	 * @return ?쇱꽱??臾몄옄??
	 */
	public static String formatPercent(Locale locale, Number number) {
		return formatPercent(locale, number, GROUPING_USED, MAX_FRACTION_DIGIT);
	}
	
	/**
	 * 湲곕낯 Locale???대떦?섎뒗 ?뺤떇?쇰줈 ?쇱꽱?몃? 蹂?섑븳??
	 * 
	 * @param number ?レ옄
	 * @param groupingUsed 洹몃９ 遺꾨━湲고샇 ?ы븿 ?щ?
	 * @return ?쇱꽱??臾몄옄??
	 */
	public static String formatPercent(Number number, boolean groupingUsed) {
		return formatPercent(number, groupingUsed, MAX_FRACTION_DIGIT);
	}

	/**
	 * Locale???대떦?섎뒗 ?뺤떇?쇰줈 ?쇱꽱?몃? 蹂?섑븳??
	 * 
	 * @param locale 濡쒖???
	 * @param number ?レ옄
	 * @param groupingUsed 洹몃９ 遺꾨━湲고샇 ?ы븿 ?щ?
	 * @return ?쇱꽱??臾몄옄??
	 */
	public static String formatPercent(Locale locale, Number number, boolean groupingUsed) {
		return formatPercent(locale, number, groupingUsed, MAX_FRACTION_DIGIT);
	}

	/**
	 * 湲곕낯 Locale???대떦?섎뒗 ?뺤떇?쇰줈 ?쇱꽱?몃? 蹂?섑븳??
	 * 
	 * @param number ?レ옄
	 * @param maxFactionDigits 蹂?섎맂 臾몄옄?댁뿉??異쒕젰???뚯닔???댄븯 理쒕? ?먮━??
	 * @return ?쇱꽱??臾몄옄??
	 */
	public static String formatPercent(Number number, int maxFactionDigits) {
		return formatPercent(number, GROUPING_USED, maxFactionDigits);
	}
	
	/**
	 * Locale???대떦?섎뒗 ?뺤떇?쇰줈 ?쇱꽱?몃? 蹂?섑븳??
	 * 
	 * @param locale 濡쒖???
	 * @param number ?レ옄
	 * @param maxFactionDigits 蹂?섎맂 臾몄옄?댁뿉??異쒕젰???뚯닔???댄븯 理쒕? ?먮━??
	 * @return ?쇱꽱??臾몄옄??
	 */
	public static String formatPercent(Locale locale, Number number, int maxFactionDigits) {
		return formatPercent(locale, number, GROUPING_USED, maxFactionDigits);
	}

	/**
	 * 湲곕낯 Locale???대떦?섎뒗 ?뺤떇?쇰줈 ?쇱꽱?몃? 蹂?섑븳??
	 * 
	 * @param number ?レ옄
	 * @param groupingUsed 洹몃９ 遺꾨━湲고샇 ?ы븿 ?щ?
	 * @param maxFactionDigits 蹂?섎맂 臾몄옄?댁뿉??異쒕젰???뚯닔???댄븯 理쒕? ?먮━??
	 * @return ?쇱꽱??臾몄옄??
	 */
	public static String formatPercent(Number number, boolean groupingUsed, int maxFactionDigits) {
		NumberFormat numberberFormat = NumberFormat.getPercentInstance();
		numberberFormat.setGroupingUsed(groupingUsed);		
		numberberFormat.setMaximumFractionDigits(maxFactionDigits);
		return numberberFormat.format(number);
	}
	
	/**
	 * Locale???대떦?섎뒗 ?뺤떇?쇰줈 ?쇱꽱?몃? 蹂?섑븳??
	 * 
	 * @param locale 濡쒖???
	 * @param number ?レ옄
	 * @param groupingUsed 洹몃９ 遺꾨━湲고샇 ?ы븿 ?щ?
	 * @param maxFactionDigits 蹂?섎맂 臾몄옄?댁뿉??異쒕젰???뚯닔???댄븯 理쒕? ?먮━??
	 * @return ?쇱꽱??臾몄옄??
	 */
	public static String formatPercent(Locale locale, Number number, boolean groupingUsed, int maxFactionDigits) {
		NumberFormat numberberFormat = NumberFormat.getPercentInstance(locale);
		numberberFormat.setGroupingUsed(groupingUsed);		
		numberberFormat.setMaximumFractionDigits(maxFactionDigits);
		return numberberFormat.format(number);
	}

}
