/**
 * Snoopy Vault - Parser Puro de Tarefas e Hábitos
 * Responsável por extrair metadados, datas, prazos, prioridades e limpar tags.
 * Totalmente puro, determinístico e livre de efeitos colaterais.
 *
 * @module core/task_parser
 */

// Regexes pré-compiladas com escapes unicode para portabilidade absoluta
const REGEX_DATA_TASKS = /\u{1F4C5}\s*(\d{2}-\d{2}-\d{4}|\d{4}-\d{2}-\d{2})/u;
const REGEX_CHECKED_TASKS = /\u{2705}\s*(\d{2}-\d{2}-\d{4}|\d{4}-\d{2}-\d{2})/u;
const REGEX_POMO = /\u{1F345}\s*(\d+)/u;
const REGEX_PRIO_CHARS = /[\u{23EB}\u{1F53C}\u{1F53D}]/gu;
const REGEX_PERIODO = /(\u{1F305}\s*Manh[ãa]|\u{2600}\s*Tarde|\u{1F319}\s*Noite)/giu;
const REGEX_REPETICAO = /\u{1F501}[^\n]+/gu;
const REGEX_HABIT_TASK = /^- \[([ xX])\] (.*)$/;
const REGEX_PROGRESSO_QUANTIDADE = /\[\s*(?:(\d+(?:\.\d+)?)\s*\/\s*)?(\d+(?:\.\d+)?)\s*([a-zA-ZÀ-ÿ]+)\s*\]/u;

const TaskParser = {
  /**
   * Extrai metadados completos de uma linha de tarefa Markdown.
   *
   * @param {string} textRaw - Linha de texto original da tarefa.
   * @param {string} todayStr - Data de referência de hoje em ISO ('YYYY-MM-DD').
   * @param {object} [dateUtils] - Instância de DateUtils para normalização.
   * @returns {object} Objeto com cleanText, dueStr, prio, pomosEst, periodo, statusPrazo, progresso.
   */
  parseMetadata(textRaw, todayStr, dateUtils) {
    const dateMatch = textRaw.match(REGEX_DATA_TASKS);
    const rawDueStr = dateMatch ? dateMatch[1] : null;
    
    let dueStr = null;
    if (rawDueStr) {
      if (dateUtils && typeof dateUtils.normalizarParaISO === 'function') {
        dueStr = dateUtils.normalizarParaISO(rawDueStr);
      } else {
        const matchBr = String(rawDueStr).match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
        dueStr = matchBr ? `${matchBr[3]}-${matchBr[2].padStart(2, '0')}-${matchBr[1].padStart(2, '0')}` : rawDueStr;
      }
    }

    let prio = null;
    if (textRaw.includes('⏫')) prio = 'alta';
    else if (textRaw.includes('🔼')) prio = 'media';
    else if (textRaw.includes('🔽')) prio = 'baixa';

    let periodo = null;
    if (textRaw.includes('🌅') || /manh[ãa]/i.test(textRaw)) periodo = '🌅 Manhã';
    else if (textRaw.includes('☀️') || /tarde/i.test(textRaw)) periodo = '☀️ Tarde';
    else if (textRaw.includes('🌙') || /noite/i.test(textRaw)) periodo = '🌙 Noite';

    const pomoMatch = textRaw.match(REGEX_POMO);
    const pomosEst = pomoMatch ? pomoMatch[1] : null;

    const progMatch = textRaw.match(REGEX_PROGRESSO_QUANTIDADE);
    let progresso = null;
    if (progMatch) {
      const meta = parseFloat(progMatch[2]);
      const feito = progMatch[1] !== undefined ? parseFloat(progMatch[1]) : null;
      const unidade = progMatch[3];
      const pct = (feito !== null && meta > 0) ? Math.min(100, Math.round((feito / meta) * 100)) : null;
      progresso = {
        raw: progMatch[0],
        feito,
        meta,
        unidade,
        pct,
        rotulo: feito !== null ? `${feito}/${meta} ${unidade}` : `${meta} ${unidade}`
      };
    }

    const cleanText = textRaw
      .replace(REGEX_DATA_TASKS, '')
      .replace(REGEX_PRIO_CHARS, '')
      .replace(REGEX_POMO, '')
      .replace(REGEX_CHECKED_TASKS, '')
      .replace(REGEX_REPETICAO, '')
      .replace(REGEX_PERIODO, '')
      .replace(REGEX_PROGRESSO_QUANTIDADE, '')
      .trim();

    let statusPrazo = 'sem_prazo';
    if (dueStr) {
      if (dueStr < todayStr) statusPrazo = 'atrasada';
      else if (dueStr === todayStr) statusPrazo = 'hoje';
      else statusPrazo = 'futura';
    }

    return { cleanText, dueStr, rawDueStr, prio, pomosEst, periodo, statusPrazo, progresso };
  },

  /**
   * Extrai dados de um hábito diário.
   *
   * @param {string} rawText - Linha de texto original do hábito.
   * @returns {{ cleanName: string, rawText: string, periodoIcon: string, freqTag: string }}
   */
  parseHabit(rawText) {
    const cleanName = rawText
      .replace(REGEX_PERIODO, '')
      .replace(REGEX_REPETICAO, '')
      .trim();

    let periodoIcon = '';
    if (rawText.includes('🌅') || /manh[ãa]/i.test(rawText)) periodoIcon = '🌅';
    else if (rawText.includes('☀️') || /tarde/i.test(rawText)) periodoIcon = '☀️';
    else if (rawText.includes('🌙') || /noite/i.test(rawText)) periodoIcon = '🌙';

    let freqTag = '';
    const matchFreq = rawText.match(/🔁\s*([A-Za-zÀ-ÿ,\- ]+)/);
    if (matchFreq) freqTag = matchFreq[1].trim();

    return { cleanName, rawText, periodoIcon, freqTag };
  }
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = TaskParser;
}

return TaskParser;
