import { StyleSheet } from '@react-pdf/renderer';

/** Mise en page PDF : A4, Helvetica, hiérarchie par la taille et le gris, filets fins. */
export const C = { fg: '#131923', muted: '#485364', subtle: '#626d7e', line: '#e0e4ea', accent: '#1c3a7d', danger: '#a5342c', success: '#2a6a4b', warning: '#8f540e' };

export const s = StyleSheet.create({
  page: { paddingTop: 48, paddingBottom: 56, paddingHorizontal: 48, fontFamily: 'Helvetica', fontSize: 9.5, color: C.fg, lineHeight: 1.45 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: C.line },
  brand: { fontSize: 9, color: C.accent, fontFamily: 'Helvetica-Bold' },
  meta: { fontSize: 8, color: C.subtle, textAlign: 'right' },
  title: { fontSize: 17, fontFamily: 'Helvetica-Bold', marginBottom: 4 },
  subtitle: { fontSize: 10, color: C.muted, marginBottom: 18 },
  h2: { fontSize: 11, fontFamily: 'Helvetica-Bold', marginTop: 18, marginBottom: 8, paddingBottom: 4, borderBottomWidth: 1, borderBottomColor: C.line },
  h3: { fontSize: 9.5, fontFamily: 'Helvetica-Bold', marginBottom: 2 },
  muted: { color: C.muted },
  subtle: { color: C.subtle, fontSize: 8 },
  row: { flexDirection: 'row', borderBottomWidth: 0.5, borderBottomColor: C.line, paddingVertical: 4 },
  th: { fontSize: 8, color: C.subtle, fontFamily: 'Helvetica-Bold' },
  cell: { paddingRight: 6 },
  right: { textAlign: 'right' },
  kpis: { flexDirection: 'row', borderWidth: 1, borderColor: C.line, borderRadius: 4, marginBottom: 6 },
  kpi: { flex: 1, padding: 8, borderRightWidth: 1, borderRightColor: C.line },
  kpiValue: { fontSize: 15, fontFamily: 'Helvetica-Bold', marginTop: 2 },
  para: { marginBottom: 6 },
  footer: { position: 'absolute', bottom: 24, left: 48, right: 48, flexDirection: 'row', justifyContent: 'space-between', fontSize: 7.5, color: C.subtle },
  signBox: { flex: 1, borderWidth: 1, borderColor: C.line, borderRadius: 4, padding: 10 },
});
