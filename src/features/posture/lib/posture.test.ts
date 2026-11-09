import { describe, expect, it } from 'vitest';
import { formAdvice, scarfRisks, suggestDiagnosis } from './posture';

const none = { moodDrop: false, lowEnergy: false, overload: false, missedDeadlines: 0, silence: false };

describe('aide à la décision', () => {
  it('collaborateur moteur en retrait avec échéances manquées : écouter d’abord (Vouloir)', () => {
    expect(suggestDiagnosis({ ...none, moodDrop: true, missedDeadlines: 2 })?.diagnosis).toBe('vouloir');
  });

  it('la surcharge oriente vers les moyens (Pouvoir), avant tout recadrage', () => {
    expect(suggestDiagnosis({ ...none, overload: true, missedDeadlines: 2 })?.diagnosis).toBe('pouvoir');
  });

  it('des échéances manquées sans signal de moral : clarifier l’attendu (Comprendre)', () => {
    expect(suggestDiagnosis({ ...none, missedDeadlines: 1 })?.diagnosis).toBe('comprendre');
  });

  it('aucun signal : pas d’hypothèse imposée', () => {
    expect(suggestDiagnosis(none)).toBeNull();
  });

  it('SCARF : seuls les domaines menacés ressortent, avec leur parade', () => {
    const risks = scarfRisks({ statut: -1, certitude: 0, autonomie: 1, relations: -1 });
    expect(risks.map((r) => r.domain)).toEqual(['statut', 'relations']);
    expect(risks[0].mitigation).toMatch(/privé/);
  });

  it('adapte la forme au profil DISC', () => {
    expect(formAdvice('S')).toMatch(/rassurez/);
    expect(formAdvice(null)).toMatch(/inconnu/);
  });
});
