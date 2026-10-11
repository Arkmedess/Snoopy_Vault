/**
 * Snoopy Vault - Utilitários Padronizados e Puros de Datas
 * Executável tanto no ecossistema Obsidian DataviewJS (Desktop e Mobile) quanto em Node.js.
 *
 * @module core/date_utils
 */
const DateUtils = {
  /**
   * Adiciona ou subtrai dias a uma data no formato ISO 'YYYY-MM-DD'.
   *
   * @param {string} dataIso - Data base no formato 'YYYY-MM-DD'.
   * @param {number} qtdDias - Quantidade de dias a somar (positivo ou negativo).
   * @returns {string} Nova data no formato 'YYYY-MM-DD'.
   */
  somarDias(dataIso, qtdDias) {
    if (!dataIso) return '';
    const d = new Date(dataIso + 'T12:00:00');
    d.setDate(d.getDate() + qtdDias);
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const dia = String(d.getDate()).padStart(2, '0');
    return `${d.getFullYear()}-${m}-${dia}`;
  },

  /**
   * Formata uma string de data para o padrão visual brasileiro 'DD-MM-YYYY'.
   * Suporta entradas ISO ('YYYY-MM-DD') e formatos com traço ou barra ('DD/MM/YYYY').
   *
   * @param {string} dStr - String de data em formato ISO ou brasileiro.
   * @returns {string} Data formatada como 'DD-MM-YYYY'.
   */
  formatarDDMMYYYY(dStr) {
    if (!dStr) return '';
    const matchIso = String(dStr).match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
    if (matchIso) {
      return `${matchIso[3].padStart(2, '0')}-${matchIso[2].padStart(2, '0')}-${matchIso[1]}`;
    }
    const matchBr = String(dStr).match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})/);
    if (matchBr) {
      return `${matchBr[1].padStart(2, '0')}-${matchBr[2].padStart(2, '0')}-${matchBr[3]}`;
    }
    return String(dStr);
  },

  /**
   * Normaliza formatos diversos de data (BR ou ISO) para o padrão estrito ISO 'YYYY-MM-DD'.
   *
   * @param {string} dStr - String de data a ser normalizada.
   * @returns {string|null} String ISO 'YYYY-MM-DD' ou null caso inválida.
   */
  normalizarParaISO(dStr) {
    if (!dStr) return null;
    const matchBr = String(dStr).match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
    if (matchBr) {
      return `${matchBr[3]}-${matchBr[2].padStart(2, '0')}-${matchBr[1].padStart(2, '0')}`;
    }
    const matchIso = String(dStr).match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
    if (matchIso) {
      return `${matchIso[1]}-${matchIso[2].padStart(2, '0')}-${matchIso[3].padStart(2, '0')}`;
    }
    return null;
  }
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = DateUtils;
}

return DateUtils;

