import type { TextStyle } from 'react-native';
import { semantic } from './colors';

/**
 * UI scale — Manrope, для хедеров/кнопок/мета.
 */
export const ui = {
  display: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 30,
    lineHeight: 36,
    letterSpacing: -0.5,
    color: semantic.ink,
  } satisfies TextStyle,
  h1: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 24,
    lineHeight: 30,
    letterSpacing: -0.3,
    color: semantic.ink,
  } satisfies TextStyle,
  h2: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 20,
    lineHeight: 26,
    color: semantic.ink,
  } satisfies TextStyle,
  h3: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 17,
    lineHeight: 22,
    color: semantic.ink,
  } satisfies TextStyle,
  body: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 15,
    lineHeight: 22,
    color: semantic.ink,
  } satisfies TextStyle,
  bodyMedium: {
    fontFamily: 'Manrope_500Medium',
    fontSize: 15,
    lineHeight: 22,
    color: semantic.ink,
  } satisfies TextStyle,
  label: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 13,
    lineHeight: 18,
    color: semantic.ink,
  } satisfies TextStyle,
  caption: {
    fontFamily: 'Manrope_500Medium',
    fontSize: 12,
    lineHeight: 16,
    color: semantic.inkDim,
  } satisfies TextStyle,
  meta: {
    fontFamily: 'Manrope_500Medium',
    fontSize: 11,
    lineHeight: 14,
    color: semantic.inkDim,
    letterSpacing: 0.2,
  } satisfies TextStyle,
};

/**
 * Reading scale — для длинного текста (статьи, курсы).
 * Body использует serif-шрифт SourceSerif4 (подгружается в _layout).
 */
export const reading = {
  h1: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 30,
    lineHeight: 38,
    letterSpacing: -0.4,
    color: semantic.ink,
  } satisfies TextStyle,
  h2: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 24,
    lineHeight: 32,
    letterSpacing: -0.2,
    color: semantic.ink,
  } satisfies TextStyle,
  h3: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 20,
    lineHeight: 28,
    color: semantic.ink,
  } satisfies TextStyle,
  body: {
    fontFamily: 'SourceSerif4_400Regular',
    fontSize: 18,
    lineHeight: 30,
    color: semantic.ink,
  } satisfies TextStyle,
  bodyLarge: {
    fontFamily: 'SourceSerif4_400Regular',
    fontSize: 20,
    lineHeight: 32,
    color: semantic.ink,
  } satisfies TextStyle,
  quote: {
    fontFamily: 'SourceSerif4_400Regular_Italic',
    fontStyle: 'italic',
    fontSize: 20,
    lineHeight: 30,
    color: semantic.ink,
  } satisfies TextStyle,
  caption: {
    fontFamily: 'Manrope_500Medium',
    fontSize: 13,
    lineHeight: 18,
    color: semantic.inkDim,
  } satisfies TextStyle,
  meta: {
    fontFamily: 'Manrope_500Medium',
    fontSize: 13,
    lineHeight: 18,
    color: semantic.inkDim,
  } satisfies TextStyle,
};

export const typography = { ui, reading };
export type UiTextToken = keyof typeof ui;
export type ReadingTextToken = keyof typeof reading;
