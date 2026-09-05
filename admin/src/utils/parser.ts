import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { ParsedRow, Subject, Topic } from '../types';

// Blank string checking helper: treating "", whitespace, "N/A", "null", "-" as blank
export function isCellBlank(value: any): boolean {
  if (value === null || value === undefined) return true;
  const str = String(value).trim().toLowerCase();
  return str === '' || str === 'n/a' || str === 'null' || str === '-';
}

export function cleanValue(value: any): string {
  if (isCellBlank(value)) return '';
  return String(value).trim();
}

export function parseCSVTextToRawRows(csvText: string): Promise<{ headers: string[]; rows: Record<string, string>[] }> {
  return new Promise((resolve, reject) => {
    Papa.parse(csvText, {
      header: true,
      skipEmptyLines: 'greedy',
      complete: (results) => {
        const headers = results.meta.fields ? results.meta.fields.map(h => h.trim()) : [];
        const rows = (results.data as Record<string, string>[]).filter(r => {
          return Object.values(r).some(v => !isCellBlank(v));
        });
        resolve({ headers, rows });
      },
      error: (err) => reject(err)
    });
  });
}

export function parseFileToRawRows(file: File): Promise<{ headers: string[]; rows: Record<string, string>[] }> {
  return new Promise((resolve, reject) => {
    const fileName = file.name.toLowerCase();

    if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];
          const jsonData = XLSX.utils.sheet_to_json<Record<string, any>>(worksheet, { header: 1, raw: false });

          if (!jsonData || jsonData.length === 0) {
            return resolve({ headers: [], rows: [] });
          }

          const rawHeaders = (jsonData[0] as string[]).map(h => String(h || '').trim());
          const rows: Record<string, string>[] = [];

          for (let i = 1; i < jsonData.length; i++) {
            const rowArr = jsonData[i] as any[];
            if (!rowArr || rowArr.length === 0 || rowArr.every(cell => isCellBlank(cell))) continue;

            const rowObj: Record<string, string> = {};
            rawHeaders.forEach((h, idx) => {
              rowObj[h] = rowArr[idx] !== undefined ? String(rowArr[idx]).trim() : '';
            });
            rows.push(rowObj);
          }

          resolve({ headers: rawHeaders, rows });
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = (error) => reject(error);
      reader.readAsArrayBuffer(file);
    } else {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: 'greedy',
        complete: (results) => {
          const headers = results.meta.fields ? results.meta.fields.map(h => h.trim()) : [];
          const rows = (results.data as Record<string, string>[]).filter(r => {
            return Object.values(r).some(v => !isCellBlank(v));
          });
          resolve({ headers, rows });
        },
        error: (err) => reject(err)
      });
    }
  });
}

export function validateAndMapRows(
  rawRows: Record<string, string>[],
  columnMapping: Record<string, string>,
  selectedExamType: string,
  selectedSubject: Subject | null,
  selectedTopic: Topic | null,
  existingQuestionTexts: Set<string>
): ParsedRow[] {
  const currentYear = new Date().getFullYear();
  const batchQuestionTexts = new Set<string>();

  return rawRows.map((rawRow, index) => {
    const rowNumber = index + 2; // Accounting for 1-based header index
    const errors: string[] = [];
    const warnings: string[] = [];

    const getVal = (targetField: string): string => {
      const mappedHeader = columnMapping[targetField] || targetField;
      return cleanValue(rawRow[mappedHeader] ?? rawRow[targetField]);
    };

    const questionText = getVal('question_text');
    const optionA = getVal('option_a');
    const optionB = getVal('option_b');
    const optionC = getVal('option_c');
    const optionD = getVal('option_d');
    const rawCorrAns = getVal('correct_answer').toUpperCase();
    const rawYear = getVal('year');
    const rawDiff = getVal('difficulty').toLowerCase() || 'medium';
    const topicExp = getVal('topic_explanation');
    const corrExp = getVal('correct_explanation');
    const wrongExp = getVal('wrong_explanations');

    // 1. Required fields check
    if (isCellBlank(questionText)) errors.push('question_text is required');
    if (isCellBlank(optionA)) errors.push('option_a is required');
    if (isCellBlank(optionB)) errors.push('option_b is required');
    if (isCellBlank(optionC)) errors.push('option_c is required');
    if (isCellBlank(optionD)) errors.push('option_d is required');
    if (isCellBlank(rawCorrAns)) errors.push('correct_answer is required');
    if (isCellBlank(rawYear)) errors.push('year is required');

    // 2. Validate correct_answer
    if (!isCellBlank(rawCorrAns) && !['A', 'B', 'C', 'D'].includes(rawCorrAns)) {
      errors.push(`Invalid correct_answer '${rawCorrAns}' (must be A, B, C, or D)`);
    }

    // 3. Validate year
    const yrNum = parseInt(rawYear, 10);
    if (!isCellBlank(rawYear) && (isNaN(yrNum) || yrNum < 1990 || yrNum > currentYear + 1)) {
      errors.push(`Invalid year '${rawYear}' (must be a 4-digit year between 1990 and ${currentYear + 1})`);
    }

    // 4. Soft warnings for explanations
    if (isCellBlank(topicExp) && isCellBlank(corrExp) && isCellBlank(wrongExp)) {
      warnings.push('Row has no answer explanations provided (blank explanations)');
    }

    // 5. Duplicate question text checks
    const normalizedQText = questionText.toLowerCase();
    if (questionText) {
      if (batchQuestionTexts.has(normalizedQText)) {
        errors.push('Exact duplicate question_text within this upload batch');
      } else {
        batchQuestionTexts.add(normalizedQText);
      }

      if (existingQuestionTexts.has(normalizedQText)) {
        warnings.push('Question text already exists in database for this subject/topic');
      }
    }

    const isValid = errors.length === 0;

    return {
      row_number: rowNumber,
      exam_type: selectedExamType,
      subject_name: selectedSubject ? selectedSubject.name : '',
      subject_id: selectedSubject ? selectedSubject.id : 0,
      topic_name: selectedTopic ? selectedTopic.name : '',
      topic_id: selectedTopic ? selectedTopic.id : 0,
      year: yrNum || currentYear,
      difficulty: ['easy', 'medium', 'hard'].includes(rawDiff) ? rawDiff : 'medium',
      question_text: questionText,
      option_a: optionA,
      option_b: optionB,
      option_c: optionC,
      option_d: optionD,
      correct_answer: ['A', 'B', 'C', 'D'].includes(rawCorrAns) ? rawCorrAns : 'A',
      topic_explanation: topicExp,
      correct_explanation: corrExp,
      wrong_explanations: wrongExp,
      errors,
      warnings,
      isValid
    };
  });
}
